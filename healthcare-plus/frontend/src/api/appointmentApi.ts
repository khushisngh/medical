// src/api/appointmentApi.ts
import axios from 'axios';
import { apiUrl } from '../config/api';

const BASE_URL = apiUrl('/api');

export const getAppointments = () => axios.get(`${BASE_URL}/appointments`);
export const createAppointment = (appointmentData: any) => axios.post(`${BASE_URL}/appointments`, appointmentData);
export const updateAppointment = (id: string, appointmentData: any) => axios.put(`${BASE_URL}/appointments/${id}`, appointmentData);
export const deleteAppointment = (id: string) => axios.delete(`${BASE_URL}/appointments/${id}`);