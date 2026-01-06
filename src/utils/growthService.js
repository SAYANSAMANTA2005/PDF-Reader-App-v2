/**
 * growthService.js
 * Handles growth, viral mechanics, referral systems, and study planning.
 */

export const generatePublicShareLink = (type, data) => {
    // In a real app, this would upload to a DB and return a short link
    const mockId = Math.random().toString(36).substring(2, 9);
    console.log(`Generating public link for ${type}:`, data);
    return `https://study-pro.ai/share/${type}/${mockId}`;
};

export const inviteFriend = (email) => {
    console.log(`Inviting ${email}...`);
    return { success: true, message: "Invitation sent! You'll get 1 Pro Week when they sign up." };
};

export const getReferralRewards = (points) => {
    const rewards = [
        { threshold: 100, reward: "Exclusive Dark Theme", unlocked: points >= 100 },
        { threshold: 500, reward: "Double AI Credits (1 Month)", unlocked: points >= 500 },
        { threshold: 1000, reward: "Tutoring Discount Voucher", unlocked: points >= 1000 },
        { threshold: 2500, reward: "Lifetime Campus Pro", unlocked: points >= 2500 },
    ];
    return rewards;
};

export const autoPlanStudy = (examDate, topics, userPace = 'balanced') => {
    // Smart Planner based on forgetting curve (1-3-7-14 sequence)
    const sessions = [];
    const startDate = new Date();
    const daysUntilExam = Math.ceil((new Date(examDate) - startDate) / (1000 * 60 * 60 * 24));

    if (!topics) return [];

    topics.forEach((topic, index) => {
        // Initial Study
        sessions.push({
            id: `init-${index}`,
            title: `Learn: ${topic}`,
            date: new Date(startDate.getTime() + (index * 86400000)),
            type: 'learn'
        });

        // Spaced Repetition (1 day later)
        sessions.push({
            id: `rev1-${index}`,
            title: `Review: ${topic}`,
            date: new Date(startDate.getTime() + ((index + 1) * 86400000)),
            type: 'review'
        });

        // 7 days later
        if (daysUntilExam > 7) {
            sessions.push({
                id: `rev7-${index}`,
                title: `Deep Recall: ${topic}`,
                date: new Date(startDate.getTime() + ((index + 7) * 86400000)),
                type: 'mastery'
            });
        }
    });

    return sessions.sort((a, b) => a.date - b.date);
};

export const clipWebpage = async (url) => {
    // Simulated browser extension clipper
    console.log("Clipping webpage:", url);
    return {
        title: "Clipped Resource",
        content: "Extracted content from " + url,
        success: true
    };
};
