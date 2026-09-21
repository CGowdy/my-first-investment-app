import dotenv from "dotenv";
import {MongoClient, ObjectId} from "mongodb";
import bcrypt from "bcryptjs";

dotenv.config({path: ".env.local"});

const databaseName = process.env.MONGODB_DATABASE;
if (!databaseName) throw new Error("MONGODB_DATABASE is required to seed manual-test accounts");

function mongoUri() {
    if (process.env.MONGODB_URI) return process.env.MONGODB_URI;

    const username = process.env.MONGODB_USERNAME;
    const password = process.env.MONGODB_PASSWORD;
    const host = process.env.MONGODB_CLUSTER_HOST;
    if (!username || !password || !host) {
        throw new Error("MONGODB_URI or the separate MongoDB connection variables are required");
    }
    return `mongodb+srv://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}/?appName=Cluster0`;
}

const client = new MongoClient(mongoUri());
const parentId = new ObjectId("66f099000000000000000001");
const childId = new ObjectId("66f099000000000000000002");
const fixtureKey = "manual-test-family";
const password = "test-pass-123";
const passwordHash = await bcrypt.hash(password, 12);

try {
    const database = client.db(databaseName);
    const users = database.collection("users");
    const childAccounts = database.collection("childaccounts");
    const transactions = database.collection("transactions");

    await users.createIndex({username: 1}, {unique: true, name: "users_username_unique"});
    const existingParent = await users.findOne({username: "test-adult"});
    if (existingParent && existingParent.fixtureKey !== fixtureKey) {
        throw new Error("test-adult already exists and is not a manual-test fixture; no account was changed");
    }
    const existingChild = await users.findOne({username: "test-child"});
    if (existingChild && existingChild.fixtureKey !== fixtureKey) {
        throw new Error("test-child already exists and is not a manual-test fixture; no account was changed");
    }

    await users.updateOne(
        {username: "test-adult"},
        {
            $set: {
                displayName: "Test Adult",
                passwordHash,
                isChildAccount: false,
                fixtureKey,
            },
            $setOnInsert: {_id: parentId},
        },
        {upsert: true},
    );

    const parent = await users.findOne({username: "test-adult"});
    if (!parent?._id) throw new Error("Unable to create the manual-test guardian");
    const familyId = parent._id.toString();

    await users.updateOne(
        {username: "test-child"},
        {
            $set: {
                displayName: "Test Child",
                passwordHash,
                isChildAccount: true,
                fixtureKey,
            },
            $setOnInsert: {_id: childId.toHexString()},
        },
        {upsert: true},
    );

    const childUser = await users.findOne({username: "test-child"});
    if (!childUser?._id) throw new Error("Unable to create the manual-test child login");
    const childUserId = childUser._id.toString();
    const childAccountId = ObjectId.isValid(childUserId) ? new ObjectId(childUserId) : childUserId;
    const createdAt = new Date();

    await childAccounts.updateOne(
        {_id: childAccountId},
        {
            $set: {
                username: "test-child",
                displayName: "Test Child",
                isChildAccount: true,
                parentId: familyId,
                fixtureKey,
            },
            $setOnInsert: {
                balance: 100,
                balanceLastUpdated: createdAt,
                interest: 5,
            },
        },
        {upsert: true},
    );

    await transactions.updateOne(
        {fixtureKey: `${fixtureKey}-opening-balance`},
        {$setOnInsert: {
            childId: childUserId,
            originalBalance: 0,
            finalBalance: 100,
            date: createdAt,
            amount: 100,
            reason: "Manual test account - initial balance",
            approved: 3,
            actorId: familyId,
            fixtureKey: `${fixtureKey}-opening-balance`,
        }},
        {upsert: true},
    );

    console.log("Manual-test accounts are ready: test-adult and test-child (password: test-pass-123)");
} finally {
    await client.close();
}
