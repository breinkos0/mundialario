-- 1. Asegurar que la columna total_points existe en la tabla users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS total_points INT DEFAULT 0;

-- 2. Asegurar que la columna penalty existe en la tabla predictions
ALTER TABLE public.predictions ADD COLUMN IF NOT EXISTS penalty INT DEFAULT 0;

-- 3. Crear/redefinir la función para mantener actualizado total_points en users
CREATE OR REPLACE FUNCTION public.update_user_total_points()
RETURNS TRIGGER AS $$
DECLARE
    v_diff INT := 0;
    v_user_id TEXT;
BEGIN
    IF (TG_OP = 'INSERT') THEN
        v_diff := COALESCE(NEW.points, 0) - COALESCE(NEW.penalty, 0);
        v_user_id := NEW.user_id;
    ELSIF (TG_OP = 'UPDATE') THEN
        v_diff := (COALESCE(NEW.points, 0) - COALESCE(NEW.penalty, 0)) - (COALESCE(OLD.points, 0) - COALESCE(OLD.penalty, 0));
        v_user_id := NEW.user_id;
    ELSIF (TG_OP = 'DELETE') THEN
        v_diff := -(COALESCE(OLD.points, 0) - COALESCE(OLD.penalty, 0));
        v_user_id := OLD.user_id;
    END IF;

    -- Actualizar total_points en la tabla users
    UPDATE public.users
    SET total_points = COALESCE(total_points, 0) + v_diff
    WHERE id = v_user_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Crear el trigger en la tabla predictions
DROP TRIGGER IF EXISTS trg_update_user_total_points ON public.predictions;
CREATE TRIGGER trg_update_user_total_points
    AFTER INSERT OR UPDATE OR DELETE ON public.predictions
    FOR EACH ROW EXECUTE FUNCTION public.update_user_total_points();

-- 5. Redefinir la función calculate_match_points
CREATE OR REPLACE FUNCTION calculate_match_points(p_match_id TEXT)
RETURNS VOID AS $$
DECLARE
    r RECORD;
    v_score_a INT;
    v_score_b INT;
    v_real_diff INT;
    v_real_result TEXT;
    v_points INT;
    v_pred_diff INT;
    v_pred_result TEXT;
    v_match_kickoff TIMESTAMPTZ;
BEGIN
    -- A. Leer score_a, score_b y kickoff_time de la tabla matches
    SELECT score_a, score_b, kickoff_time INTO v_score_a, v_score_b, v_match_kickoff
    FROM matches
    WHERE id = p_match_id;

    IF v_score_a IS NULL OR v_score_b IS NULL THEN
        RAISE EXCEPTION 'Match score_a or score_b is NULL for match_id: %', p_match_id;
    END IF;

    v_real_diff := v_score_a - v_score_b;
    v_real_result := CASE 
        WHEN v_real_diff > 0 THEN 'A'
        WHEN v_real_diff < 0 THEN 'B'
        ELSE 'TIE'
    END;

    -- B. Para cada usuario que NO tenga una predicción para este partido, insertar una predicción por defecto
    -- con pred_a = -1, pred_b = -1, points = -1 y penalty = 0.
    -- SOLO si el kickoff_time del partido es mayor o igual que el kickoff_time de su primer pronóstico real
    -- (el partido con el kickoff_time más antiguo donde haya puesto un marcador real: pred_a >= 0 y pred_b >= 0).
    IF v_match_kickoff IS NOT NULL THEN
        INSERT INTO public.predictions (user_id, match_id, pred_a, pred_b, points, penalty)
        SELECT u.id, p_match_id, -1, -1, -1, 0
        FROM public.users u
        WHERE NOT EXISTS (
            SELECT 1 
            FROM public.predictions p 
            WHERE p.user_id = u.id AND p.match_id = p_match_id
        )
        AND EXISTS (
            SELECT 1
            FROM public.predictions p2
            JOIN public.matches m2 ON p2.match_id = m2.id
            WHERE p2.user_id = u.id AND p2.pred_a >= 0 AND p2.pred_b >= 0
        )
        AND v_match_kickoff >= (
            SELECT MIN(m2.kickoff_time)
            FROM public.predictions p2
            JOIN public.matches m2 ON p2.match_id = m2.id
            WHERE p2.user_id = u.id AND p2.pred_a >= 0 AND p2.pred_b >= 0
        );
    END IF;

    -- C. Iterar sobre todas las predicciones reales para ese p_match_id (excluyendo las de penalización por defecto)
    FOR r IN 
        SELECT id, pred_a, pred_b 
        FROM predictions 
        WHERE match_id = p_match_id AND pred_a >= 0 AND pred_b >= 0
    LOOP
        v_points := 0;
        v_pred_diff := r.pred_a - r.pred_b;
        v_pred_result := CASE 
            WHEN v_pred_diff > 0 THEN 'A'
            WHEN v_pred_diff < 0 THEN 'B'
            ELSE 'TIE'
        END;

        -- 1. Tendencia (+2 pts)
        IF v_real_result = v_pred_result THEN
            v_points := v_points + 2;
            -- 2. Diferencia Exacta (Bonus +1 pt, solo si hay tendencia)
            IF v_real_diff = v_pred_diff THEN
                v_points := v_points + 1;
            END IF;
        END IF;

        -- 3. Goles exactos por equipo (+1 pt cada uno, independiente del resultado)
        IF r.pred_a = v_score_a THEN
            v_points := v_points + 1;
        END IF;

        IF r.pred_b = v_score_b THEN
            v_points := v_points + 1;
        END IF;

        -- Actualizar el campo points en predictions
        UPDATE predictions
        SET points = v_points
        WHERE id = r.id;
    END LOOP;

    -- D. Marcar partido como calculado
    UPDATE matches
    SET is_calculated = TRUE
    WHERE id = p_match_id;
END;
$$ LANGUAGE plpgsql;

-- 6. Limpiar predicciones por defecto que se crearon incorrectamente en partidos anteriores
-- al primer pronóstico real de cada usuario (o si el usuario nunca ha pronosticado de forma real).
DELETE FROM public.predictions p
USING public.matches m
WHERE p.match_id = m.id
  AND p.pred_a = -1 
  AND p.pred_b = -1
  AND (
    -- El usuario no tiene ningún pronóstico real
    NOT EXISTS (
        SELECT 1
        FROM public.predictions p2
        JOIN public.matches m2 ON p2.match_id = m2.id
        WHERE p2.user_id = p.user_id AND p2.pred_a >= 0 AND p2.pred_b >= 0
    )
    -- O el partido de la predicción por defecto ocurrió antes de su primer pronóstico real
    OR m.kickoff_time < (
        SELECT MIN(m2.kickoff_time)
        FROM public.predictions p2
        JOIN public.matches m2 ON p2.match_id = m2.id
        WHERE p2.user_id = p.user_id AND p2.pred_a >= 0 AND p2.pred_b >= 0
    )
  );

-- 7. Recalcular total_points para todos los usuarios y garantizar la consistencia
UPDATE public.users u
SET total_points = COALESCE((
    SELECT SUM(points - penalty)
    FROM public.predictions p
    WHERE p.user_id = u.id
), 0);
