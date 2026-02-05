import api from "./api";

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
    const res = await api.post(`/expert/assignments/${id}/submit`, {
        assignmentId: id,
        user_evaluation_output: payload.scores // flatten to match schema
    });
    console.log("Submission response:", id);
    console.log(payload);
    return res.data;
};
