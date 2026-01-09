const admin = require('firebase-admin');

// Initialize with default credentials or project ID
if (!admin.apps.length) {
    admin.initializeApp({
        projectId: 'terri-tori'
    });
}

const db = admin.firestore();

async function seedRatioData() {
    console.log("Starting seed data...");

    let seasonId = null;
    const seasonsSnap = await db.collection('seasons').where('isCurrent', '==', true).limit(1).get();

    if (seasonsSnap.empty) {
        console.log("No current season found. Creating dummy 'season_test'...");
        seasonId = 'season_test';
        await db.collection('seasons').doc(seasonId).set({
            seasonId,
            isCurrent: true,
            groups: [1, 2, 3],
            createdAt: admin.firestore.Timestamp.now()
        });
    } else {
        seasonId = seasonsSnap.docs[0].id;
    }
    console.log(`Current Season: ${seasonId}`);

    // Update for Group 1
    const groupId = "1";
    const groupRef = db.collection('seasons').doc(seasonId).collection('groups').doc(groupId);

    const dummyStats = {
        stats: {
            totalGroupArea: 1000,
            updatedAt: admin.firestore.Timestamp.now(),
            areaDistribution: [
                {
                    userId: "test_user_1",
                    displayName: "Seed User A",
                    photoUrl: null,
                    totalArea: 600,
                    ratio: 60.0
                },
                {
                    userId: "test_user_2",
                    displayName: "Seed User B",
                    photoUrl: null,
                    totalArea: 300,
                    ratio: 30.0
                },
                {
                    userId: "test_user_3",
                    displayName: "Seed User C",
                    photoUrl: null,
                    totalArea: 100,
                    ratio: 10.0
                }
            ]
        }
    };

    await groupRef.set(dummyStats, { merge: true });
    console.log(`Seeded stats data for Season ${seasonId}, Group ${groupId}`);
}

seedRatioData().then(() => {
    console.log("Done.");
    process.exit(0);
}).catch(err => {
    console.error("Error:", err);
    process.exit(1);
});
