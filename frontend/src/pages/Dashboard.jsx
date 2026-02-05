// src/pages/Dashboard.jsx
import { useEffect, useState, useRef } from "react";
import StatCard from "../components/StatCard";
import EvaluationTable from "../components/EvaluationTable";
import { Link } from "react-router-dom";
import { CircularProgressbarWithChildren, buildStyles } from "react-circular-progressbar";
import 'react-circular-progressbar/dist/styles.css';

// Mock data imports
import dimensionsData from "../data/mockD.json";
import evaluationsData from "../data/mock.json";

export default function Dashboard() {
    const [dimensions, setDimensions] = useState([]);
    const [evaluations, setEvaluations] = useState([]);
    const scrollRef = useRef(null);
    const [scrollIndex, setScrollIndex] = useState(0);

    // Mock user and performance
    const userName = "User123";
    const currentPerformance = 72; // %
    const goalPerformance = 85; // %
    const maxPerformance = 100; // %
    const modelVersion = "v1.2.3";

    useEffect(() => {
        setDimensions(dimensionsData);
        setEvaluations(evaluationsData);
    }, []);

    // Auto-scroll dimensions every 3 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            if (dimensions.length <= 2) return;
            setScrollIndex(prev => (prev + 1) % dimensions.length);
            const scrollEl = scrollRef.current;
            if (scrollEl) {
                const cardWidth = scrollEl.children[0].offsetWidth;
                scrollEl.scrollTo({
                    left: scrollIndex * cardWidth,
                    behavior: "smooth"
                });
            }
        }, 3000);
        return () => clearInterval(interval);
    }, [scrollIndex, dimensions]);

    return (
        <div className="min-h-screen w-full bg-base-100 px-6 py-8 space-y-8">

            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold">Welcome, {userName}!</h1>
                <p className="opacity-60">Overview of your evaluations and model performance</p>
            </div>

            {/* Overall Model Statistics */}
            <div className="flex gap-6 relative min-h-[40vh]">
                {/* Scrollable dimension cards */}
                <div className="flex gap-4 overflow-x-auto flex-1 p-2 bg-base-200 rounded-lg shadow-md">
                    {dimensions.map((d) => (
                        <StatCard
                            key={d.dimension_name}
                            title={d.dimension_name}
                            value={d.average_score}
                            subtitle={d.sentiment}
                            style={{ minWidth: "250px", flexShrink: 0 }}
                        />
                    ))}
                </div>

                {/* Fixed half-circle performance */}
                <div className="w-1/5 flex flex-col items-center justify-center p-4 bg-base-200 rounded-lg shadow-md">
                    <div style={{ width: "160px", height: "80px" }}>
                        <CircularProgressbarWithChildren
                            value={currentPerformance}
                            maxValue={maxPerformance}
                            strokeWidth={16}
                            styles={buildStyles({
                                rotation: 0.75, // half-circle
                                strokeLinecap: "round",
                                pathColor: "#3B82F6",
                                trailColor: "#E5E7EB",
                            })}
                        >
                        </CircularProgressbarWithChildren>
                        <div className="text-center">
                            <strong>{currentPerformance}%</strong>
                            <p className="text-sm opacity-70">Goal: {goalPerformance}%</p>
                            <p className="mt-2 text-sm opacity-60">Model Version: {modelVersion}</p>
                        </div>
                    </div>
                </div>
            </div>


            {/* My Evaluations */}
            <div className="space-y-4">
                <h2 className="text-2xl font-bold">My Evaluations</h2>
                <EvaluationTable evaluations={evaluations} />
            </div>
        </div>
    );
}
