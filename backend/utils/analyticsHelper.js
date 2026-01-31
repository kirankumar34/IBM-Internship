const Task = require('../models/taskModel');
const Milestone = require('../models/milestoneModel');

/**
 * Standardized calculation for Project Progress
 * Formula: ((Completed Milestones / Total Milestones) * 100 + (Completed Tasks / Total Tasks) * 100) / 2
 */
const calculateProjectProgress = async (projectId) => {
    const [tasks, milestones] = await Promise.all([
        Task.find({ project: projectId }),
        Milestone.find({ project: projectId })
    ]);

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'Completed').length;
    const taskProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    const totalMilestones = milestones.length;
    const completedMilestones = milestones.filter(m => m.status === 'Completed').length;
    const milestoneProgress = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0;

    // If no milestones and no tasks, progress is 0
    if (totalTasks === 0 && totalMilestones === 0) return 0;

    // If only tasks or only milestones exist, return that progress directly
    if (totalMilestones === 0) return Math.round(taskProgress);
    if (totalTasks === 0) return Math.round(milestoneProgress);

    return Math.round((taskProgress + milestoneProgress) / 2);
};

module.exports = {
    calculateProjectProgress
};
