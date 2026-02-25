import api from "./index";

/* LIST */
export const getMyAssignments = async () => {
    const res = await api.get("/expert/assignments");
    return res.data;
};

/* SINGLE */
export const getAssignmentById = async (id) => {
    const res = await api.get(`/expert/assignments/${id}`);
    return res.data;
};

/* SUBMIT */
export const submitEvaluation = async (id, payload) => {
    const res = await api.post(`/expert/assignments/${id}/submit`, payload);
    return res.data;
};

/* DRAFT */
export const saveEvaluationDraft = async (id, payload) => {
    const res = await api.post(`/expert/assignments/${id}/draft`, payload);
    return res.data;
};

/* DASHBOARD */
export const getExpertDashboardStats = async () => {
    const res = await api.get("/expert/stats");
    return res.data;
};
