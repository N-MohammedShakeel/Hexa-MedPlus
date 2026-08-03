import { useState, useEffect } from 'react';
import axiosInstance from '../../config/axios';
import { API_ENDPOINTS } from '../../common/constants/apiEndpoints';

export function usePatients() {
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchPatients = async () => {
            try {
                setLoading(true);
                const response = await axiosInstance.get(API_ENDPOINTS.PATIENTS.LIST);
                setPatients(response.data);
                setError(null);
            } catch (err) {
                console.error("Failed to fetch patients", err);
                setError("Failed to load patient directory.");
            } finally {
                setLoading(false);
            }
        };

        fetchPatients();
    }, []);

    return { patients, loading, error };
}

export function usePatientDetail(id) {
    const [patient, setPatient] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!id) return;
        
        const fetchPatient = async () => {
            try {
                setLoading(true);
                const response = await axiosInstance.get(API_ENDPOINTS.PATIENTS.DETAIL(id));
                setPatient(response.data);
                setError(null);
            } catch (err) {
                console.error(`Failed to fetch patient ${id}`, err);
                setError("Failed to load patient details.");
            } finally {
                setLoading(false);
            }
        };

        fetchPatient();
    }, [id]);

    return { patient, loading, error };
}
