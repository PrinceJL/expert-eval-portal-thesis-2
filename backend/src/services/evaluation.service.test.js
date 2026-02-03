const evaluationService = require('./evaluation.service');
const EvaluationResponse = require('../models/mongo/evaluation.model');

// Mock the Mongoose model
jest.mock('../models/mongo/evaluation.model');

describe('Evaluation Service', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('validateEvaluation', () => {
        it('should validate valid scores', () => {
            const scores = {
                legalCorrectness: { value: 5 },
                jurisdictionalPrecision: { value: 4 },
                linguisticAccessibility: { value: 3 },
                temporalValidity: { value: 5 }
            };
            expect(() => evaluationService.validateEvaluation(scores)).not.toThrow();
        });

        it('should throw error if scores object is missing', () => {
            expect(() => evaluationService.validateEvaluation(null)).toThrow("Scores object is missing");
        });

        it('should throw error if a required field is missing', () => {
            const scores = {
                legalCorrectness: { value: 5 },
                // jurisdictionalPrecision missing
                linguisticAccessibility: { value: 3 },
                temporalValidity: { value: 5 }
            };
            expect(() => evaluationService.validateEvaluation(scores)).toThrow(/Missing score object for/);
        });

        it('should throw error if value is out of range', () => {
            const scores = {
                legalCorrectness: { value: 6 }, // Invalid
                jurisdictionalPrecision: { value: 4 },
                linguisticAccessibility: { value: 3 },
                temporalValidity: { value: 5 }
            };
            expect(() => evaluationService.validateEvaluation(scores)).toThrow(/Invalid Likert score/);
        });
    });

    describe('saveDraft', () => {
        it('should save a draft evaluation', async () => {
            const mockData = { assignmentId: '123', scores: {} };
            EvaluationResponse.findOneAndUpdate.mockResolvedValue(mockData);

            const result = await evaluationService.saveDraft(mockData);

            expect(EvaluationResponse.findOneAndUpdate).toHaveBeenCalledWith(
                { assignmentId: '123' },
                { ...mockData, submitted: false },
                { upsert: true, new: true }
            );
            expect(result).toEqual(mockData);
        });
    });

    describe('submitEvaluation', () => {
        it('should submit a valid evaluation', async () => {
            const mockData = {
                assignmentId: '123',
                scores: {
                    legalCorrectness: { value: 5 },
                    jurisdictionalPrecision: { value: 4 },
                    linguisticAccessibility: { value: 3 },
                    temporalValidity: { value: 5 }
                }
            };
            EvaluationResponse.findOneAndUpdate.mockResolvedValue({ ...mockData, submitted: true });

            const result = await evaluationService.submitEvaluation(mockData);

            expect(EvaluationResponse.findOneAndUpdate).toHaveBeenCalledWith(
                { assignmentId: '123' },
                expect.objectContaining({ submitted: true }),
                { upsert: true, new: true }
            );
            expect(result.submitted).toBe(true);
        });

        it('should throw error if submission is invalid', async () => {
            const mockData = {
                assignmentId: '123',
                scores: {
                    legalCorrectness: { value: 6 }, // Invalid
                    jurisdictionalPrecision: { value: 4 },
                    linguisticAccessibility: { value: 3 },
                    temporalValidity: { value: 5 }
                }
            };

            await expect(evaluationService.submitEvaluation(mockData)).rejects.toThrow();
            expect(EvaluationResponse.findOneAndUpdate).not.toHaveBeenCalled();
        });
    });
});
