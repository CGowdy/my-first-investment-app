import dotenv from "dotenv";
import {MongoClient, ObjectId} from "mongodb";

dotenv.config({path: ".env.local"});

const requiredVariables = [
    "MONGODB_USERNAME",
    "MONGODB_PASSWORD",
    "MONGODB_CLUSTER_HOST",
    "MONGODB_DATABASE",
];

for (const variable of requiredVariables) {
    if (!process.env[variable]) {
        throw new Error(`${variable} is required to clean MongoDB integration fixtures`);
    }
}

const username = encodeURIComponent(process.env.MONGODB_USERNAME);
const password = encodeURIComponent(process.env.MONGODB_PASSWORD);
const uri = `mongodb+srv://${username}:${password}@${process.env.MONGODB_CLUSTER_HOST}/?appName=Cluster0`;
const client = new MongoClient(uri);
const fixtureKey = "playwright-mongo-integration";
const childIds = [
    new ObjectId("65ada4aaf492160c42729149").toHexString(),
    new ObjectId("65ada4aaf492160c4272914a").toHexString(),
    new ObjectId("65ada4aaf492160c4272914b").toHexString(),
];

try {
    const database = client.db(process.env.MONGODB_DATABASE);
    await database.collection("transactions").deleteMany({childId: {$in: childIds}});
    await database.collection("childaccounts").deleteMany({fixtureKey});
    await database.collection("users").deleteMany({fixtureKey});
    console.log("MongoDB integration fixtures were removed");
} finally {
    await client.close();
}
