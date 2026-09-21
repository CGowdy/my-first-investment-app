import dotenv from "dotenv";
import {MongoClient, ObjectId} from "mongodb";
import bcrypt from "bcryptjs";

dotenv.config({path: ".env.local"});

const requiredVariables = [
    "MONGODB_USERNAME",
    "MONGODB_PASSWORD",
    "MONGODB_CLUSTER_HOST",
    "MONGODB_DATABASE",
];

for (const variable of requiredVariables) {
    if (!process.env[variable]) {
        throw new Error(`${variable} is required to seed MongoDB integration fixtures`);
    }
}

const username = encodeURIComponent(process.env.MONGODB_USERNAME);
const password = encodeURIComponent(process.env.MONGODB_PASSWORD);
const uri = `mongodb+srv://${username}:${password}@${process.env.MONGODB_CLUSTER_HOST}/?appName=Cluster0`;
const client = new MongoClient(uri);

const parentId = new ObjectId("65ada4aaf492160c42729148");
const firstChildId = new ObjectId("65ada4aaf492160c42729149");
const spendChildId = new ObjectId("65ada4aaf492160c4272914a");
const adjustmentChildId = new ObjectId("65ada4aaf492160c4272914b");
const fixtureKey = "playwright-mongo-integration";

const today = new Date();
today.setHours(12, 0, 0, 0);
const passwordHash = await bcrypt.hash("pass123", 12);

try {
    const database = client.db(process.env.MONGODB_DATABASE);
    const users = database.collection("users");
    const childAccounts = database.collection("childaccounts");
    const transactions = database.collection("transactions");

    await users.createIndex({username: 1}, {unique: true, name: "users_username_unique"});

    await users.bulkWrite([
        {
            replaceOne: {
                filter: {_id: parentId},
                replacement: {
                    _id: parentId,
                    username: "firstmongouser",
                    passwordHash,
                    displayName: "First Mongo Parent",
                    isChildAccount: false,
                    fixtureKey,
                },
                upsert: true,
            },
        },
        {
            replaceOne: {
                filter: {_id: firstChildId.toHexString()},
                replacement: {
                    _id: firstChildId.toHexString(),
                    username: "firstmongochild",
                    passwordHash,
                    displayName: "First Mongo Child",
                    isChildAccount: true,
                    fixtureKey,
                },
                upsert: true,
            },
        },
        {
            replaceOne: {
                filter: {_id: spendChildId.toHexString()},
                replacement: {
                    _id: spendChildId.toHexString(),
                    username: "spendmoneychild",
                    passwordHash,
                    displayName: "Spend Money Child",
                    isChildAccount: true,
                    fixtureKey,
                },
                upsert: true,
            },
        },
        {
            replaceOne: {
                filter: {_id: adjustmentChildId.toHexString()},
                replacement: {
                    _id: adjustmentChildId.toHexString(),
                    username: "adjustmentchild",
                    passwordHash,
                    displayName: "Adjustment Child",
                    isChildAccount: true,
                    fixtureKey,
                },
                upsert: true,
            },
        },
    ]);

    await childAccounts.bulkWrite([
        {
            replaceOne: {
                filter: {_id: firstChildId},
                replacement: {
                    _id: firstChildId,
                    username: "firstmongochild",
                    displayName: "First Mongo Child",
                    isChildAccount: true,
                    parentId: parentId.toHexString(),
                    balance: 100,
                    balanceLastUpdated: today,
                    interest: 5,
                    fixtureKey,
                },
                upsert: true,
            },
        },
        {
            replaceOne: {
                filter: {_id: spendChildId},
                replacement: {
                    _id: spendChildId,
                    username: "spendmoneychild",
                    displayName: "Spend Money Child",
                    isChildAccount: true,
                    parentId: parentId.toHexString(),
                    balance: 75,
                    balanceLastUpdated: today,
                    interest: 5,
                    fixtureKey,
                },
                upsert: true,
            },
        },
        {
            replaceOne: {
                filter: {_id: adjustmentChildId},
                replacement: {
                    _id: adjustmentChildId,
                    username: "adjustmentchild",
                    displayName: "Adjustment Child",
                    isChildAccount: true,
                    parentId: parentId.toHexString(),
                    balance: 60,
                    balanceLastUpdated: today,
                    interest: 5,
                    fixtureKey,
                },
                upsert: true,
            },
        },
    ]);

    await transactions.deleteMany({
        childId: {$in: [firstChildId.toHexString(), spendChildId.toHexString(), adjustmentChildId.toHexString()]},
    });

    console.log("MongoDB integration fixtures are ready");
} finally {
    await client.close();
}
