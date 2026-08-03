import { useState, useEffect } from 'react';
import axiosInstance from '../../config/axios';
import { API_ENDPOINTS } from '../../common/constants/apiEndpoints';

export function usePatientEncounters(patientId) {
    const [encounters, setEncounters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!patientId) return;

        const fetchEncounters = async () => {
            try {
                setLoading(true);
                const response = await axiosInstance.get(API_ENDPOINTS.ENCOUNTERS.BY_PATIENT(patientId));
                setEncounters(response.data);
                setError(null);
            } catch (err) {
                console.error(`Failed to fetch encounters for patient ${patientId}`, err);
                setError("Failed to load patient encounters.");
            } finally {
                setLoading(false);
            }
        };

        fetchEncounters();
    }, [patientId]);

    const refetch = async () => {
        if (!patientId) return;
        try {
            const response = await axiosInstance.get(API_ENDPOINTS.ENCOUNTERS.BY_PATIENT(patientId));
            setEncounters(response.data);
            setError(null);
        } catch (err) {
            console.error(`Failed to refetch encounters for patient ${patientId}`, err);
        }
    };

    return { encounters, loading, error, refetch };
}

export function useEncounterDetail(encounterId) {
    const [encounter, setEncounter] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!encounterId) return;

        const fetchEncounter = async () => {
            try {
                setLoading(true);
                const response = await axiosInstance.get(API_ENDPOINTS.ENCOUNTERS.DETAIL(encounterId));
                setEncounter(response.data);
                setError(null);
            } catch (err) {
                console.error(`Failed to fetch encounter ${encounterId}`, err);
                setError("Failed to load encounter details.");
            } finally {
                setLoading(false);
            }
        };

        fetchEncounter();
    }, [encounterId]);

    return { encounter, loading, error };
}

export function useAllEncounters() {
    const [encounters, setEncounters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchEncounters = async () => {
            try {
                setLoading(true);
                const response = await axiosInstance.get('/api/encounters');
                setEncounters(Array.isArray(response.data) ? response.data : []);
                setError(null);
            } catch (err) {
                console.error("Failed to fetch all encounters", err);
                setError("Failed to load encounters.");
                setEncounters([]);
            } finally {
                setLoading(false);
            }
        };

        fetchEncounters();
    }, []);

    return { encounters, loading, error };
}
