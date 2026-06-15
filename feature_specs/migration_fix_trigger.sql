-- Fix validation trigger to allow updating points and penalties after kickoff
CREATE OR REPLACE FUNCTION public.validate_prediction_time()
RETURNS TRIGGER AS $$
DECLARE
    v_kickoff TIMESTAMPTZ;
BEGIN
    -- Obtener el kickoff_time del partido
    SELECT kickoff_time INTO v_kickoff
    FROM public.matches
    WHERE id = NEW.match_id;

    -- Solo lanzar excepción si el partido ya empezó Y es una inserción
    -- o una actualización que modifica los goles pronosticados (pred_a o pred_b)
    IF v_kickoff IS NOT NULL AND NOW() > v_kickoff THEN
        -- Permitir la inserción automática de penalizaciones por defecto del sistema (marcadores en -1)
        IF TG_OP = 'INSERT' AND (NEW.pred_a < 0 OR NEW.pred_b < 0) THEN
            -- Permitir inserción del sistema
        ELSIF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND (OLD.pred_a IS DISTINCT FROM NEW.pred_a OR OLD.pred_b IS DISTINCT FROM NEW.pred_b)) THEN
            RAISE EXCEPTION 'No se pueden guardar o modificar predicciones una vez que el partido ha comenzado (kickoff: %)', v_kickoff;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
