import "server-only";

import {
    Collection as MongoCollection,
    ClientSession,
    Document,
    Filter,
    MongoClient,
    ObjectId,
} from "mongodb";

type MongoGlobal = typeof globalThis & {
    myFirstInvestmentMongoClient?: Promise<MongoClient>;
};

const mongoGlobal = globalThis as MongoGlobal;

function getMongoUri(): string {
    const username = process.env.MONGODB_USERNAME;
    const password = process.env.MONGODB_PASSWORD;
    const host = process.env.MONGODB_CLUSTER_HOST;
    if (username && password && host) {
        return `mongodb+srv://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}/?appName=Cluster0`;
    }

    if (process.env.MONGODB_URI) {
        return process.env.MONGODB_URI;
    }

    throw new Error("MongoDB connection environment variables are not configured");
}

function getMongoClient(): Promise<MongoClient> {
    const uri = getMongoUri();

    mongoGlobal.myFirstInvestmentMongoClient ??= new MongoClient(uri).connect();
    return mongoGlobal.myFirstInvestmentMongoClient;
}

async function getCollection(collection: string): Promise<MongoCollection<Document>> {
    const database = process.env.MONGODB_DATABASE;
    if (!database) {
        throw new Error("MONGODB_DATABASE is not configured");
    }

    const client = await getMongoClient();
    return client.db(database).collection(collection);
}

function reportFailure(operation: string, error: unknown): void {
    // Driver messages can contain sensitive connection details. Names and codes are enough for diagnosis.
    const metadata = isRecord(error)
        ? {name: error.name ?? "Error", code: error.code ?? "unknown"}
        : {name: "Error", code: "unknown"};
    console.error(`MongoDB ${operation} failed`, metadata);
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toMongoValue(value: unknown): unknown {
    if (value instanceof Date || value instanceof ObjectId) {
        return value;
    }

    if (Array.isArray(value)) {
        return value.map(toMongoValue);
    }

    if (!isRecord(value)) {
        return value;
    }

    if (value.$oid instanceof ObjectId) {
        return value.$oid;
    }

    if (typeof value.$oid === "string" && ObjectId.isValid(value.$oid)) {
        return new ObjectId(value.$oid);
    }

    if (typeof value.$date === "string" || value.$date instanceof Date) {
        return new Date(value.$date);
    }

    return Object.fromEntries(
        Object.entries(value).map(([key, nestedValue]) => [key, toMongoValue(nestedValue)]),
    );
}

function fromMongoValue(value: unknown): unknown {
    if (value instanceof ObjectId) {
        return value.toHexString();
    }

    if (value instanceof Date) {
        return value;
    }

    if (Array.isArray(value)) {
        return value.map(fromMongoValue);
    }

    if (!isRecord(value)) {
        return value;
    }

    return Object.fromEntries(
        Object.entries(value).map(([key, nestedValue]) => [key, fromMongoValue(nestedValue)]),
    );
}

function idFilter(id: string): Filter<Document> {
    if (!ObjectId.isValid(id)) {
        return {_id: id} as unknown as Filter<Document>;
    }

    // Prototype records may use either string IDs or Atlas-generated ObjectIds.
    return {_id: {$in: [id, new ObjectId(id)]}} as unknown as Filter<Document>;
}

function withoutImmutableId(update: object): Document {
    const normalized = toMongoValue(update);
    if (!isRecord(normalized)) {
        return {};
    }

    const {_id: _ignored, ...mutableFields} = normalized;
    return mutableFields;
}

export async function findById<T>(collection: string, id: string, session?: ClientSession): Promise<FindOneResponse<T> | null> {
    try {
        const document = await (await getCollection(collection)).findOne(idFilter(id), {session});
        return {document: fromMongoValue(document) as T | null};
    } catch (error) {
        reportFailure("findById", error);
        return null;
    }
}

export async function findOne<T>(
    collection: string,
    filter: object = {},
    session?: ClientSession,
): Promise<FindOneResponse<T> | null> {
    try {
        const document = await (await getCollection(collection)).findOne(
            toMongoValue(filter) as Filter<Document>,
            {session},
        );
        return {document: fromMongoValue(document) as T | null};
    } catch (error) {
        reportFailure("findOne", error);
        return null;
    }
}

export async function findMany<T>(collection: string, filter: object = {}, session?: ClientSession): Promise<FindManyResponse<T> | null> {
    try {
        const documents = await (await getCollection(collection))
            .find(toMongoValue(filter) as Filter<Document>, {session})
            .toArray();
        return {documents: fromMongoValue(documents) as T[]};
    } catch (error) {
        reportFailure("findMany", error);
        return null;
    }
}

export async function insertOne<T>(
    collection: string,
    documentData: T,
    session?: ClientSession,
): Promise<InsertOneResponse | null> {
    try {
        const result = await (await getCollection(collection)).insertOne(
            toMongoValue(documentData) as Document,
            {session},
        );
        return {insertedId: result.insertedId.toString()};
    } catch (error) {
        reportFailure("insertOne", error);
        return null;
    }
}

export async function insertMany<T>(collection: string, documentsData: T[]): Promise<InsertManyResponse | null> {
    try {
        const result = await (await getCollection(collection)).insertMany(
            documentsData.map(document => toMongoValue(document) as Document),
        );
        return {insertedIds: Object.values(result.insertedIds).map(id => id.toString())};
    } catch (error) {
        reportFailure("insertMany", error);
        return null;
    }
}

export async function updateOneById<T>(
    collection: string,
    id: string,
    update: object,
    session?: ClientSession,
): Promise<UpdateOneResponse | null> {
    return updateOne<T>(collection, idFilter(id), update, session);
}

export async function updateOneByIdOrThrow<T>(
    collection: string,
    id: string,
    update: object,
    session?: ClientSession,
): Promise<UpdateOneResponse> {
    const result = await (await getCollection(collection)).updateOne(
        idFilter(id),
        {$set: withoutImmutableId(update)},
        {session},
    );
    return {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
        upsertedId: result.upsertedId?.toString(),
    };
}

export async function insertOneOrThrow<T>(
    collection: string,
    documentData: T,
    session?: ClientSession,
): Promise<InsertOneResponse> {
    const result = await (await getCollection(collection)).insertOne(
        toMongoValue(documentData) as Document,
        {session},
    );
    return {insertedId: result.insertedId.toString()};
}

let userUsernameIndexPromise: Promise<string> | undefined;

export async function ensureUserUsernameUniqueIndex(): Promise<void> {
    userUsernameIndexPromise ??= getCollection(Collection.Users).then(collection => collection.createIndex(
        {username: 1},
        {unique: true, name: "users_username_unique"},
    ));
    try {
        await userUsernameIndexPromise;
    } catch (error) {
        userUsernameIndexPromise = undefined;
        throw error;
    }
}

export function isDuplicateKeyError(error: unknown): boolean {
    return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
}

export async function updateOne<T>(
    collection: string,
    filter: object,
    update: object,
    session?: ClientSession,
): Promise<UpdateOneResponse | null> {
    try {
        const result = await (await getCollection(collection)).updateOne(
            toMongoValue(filter) as Filter<Document>,
            {$set: withoutImmutableId(update)},
            {session},
        );
        return {
            matchedCount: result.matchedCount,
            modifiedCount: result.modifiedCount,
            upsertedId: result.upsertedId?.toString(),
        };
    } catch (error) {
        reportFailure("updateOne", error);
        return null;
    }
}

export async function withMongoTransaction<T>(operation: (session: ClientSession) => Promise<T>): Promise<T> {
    const client = await getMongoClient();
    return client.withSession(session => session.withTransaction(() => operation(session)));
}

export async function deleteById(collection: string, id: string): Promise<DeleteResponse | null> {
    return deleteOne(collection, idFilter(id));
}

export async function deleteOne(collection: string, filter: object): Promise<DeleteResponse | null> {
    try {
        const result = await (await getCollection(collection)).deleteOne(
            toMongoValue(filter) as Filter<Document>,
        );
        return {deletedCount: result.deletedCount};
    } catch (error) {
        reportFailure("deleteOne", error);
        return null;
    }
}

export async function deleteMany(collection: string, filter: object): Promise<DeleteResponse | null> {
    try {
        const result = await (await getCollection(collection)).deleteMany(
            toMongoValue(filter) as Filter<Document>,
        );
        return {deletedCount: result.deletedCount};
    } catch (error) {
        reportFailure("deleteMany", error);
        return null;
    }
}

export async function aggregate<T>(
    collection: string,
    pipeline: object[] = [],
): Promise<AggregateResponse<T> | null> {
    try {
        const documents = await (await getCollection(collection))
            .aggregate(toMongoValue(pipeline) as Document[])
            .toArray();
        return {documents: fromMongoValue(documents) as T[]};
    } catch (error) {
        reportFailure("aggregate", error);
        return null;
    }
}

export type FindOneResponse<T> = {
    document: T | null;
};

export type FindManyResponse<T> = {
    documents: T[];
};

export type AggregateResponse<T> = {
    documents: T[];
};

export type InsertOneResponse = {
    insertedId: string;
};

export type InsertManyResponse = {
    insertedIds: string[];
};

export type UpdateOneResponse = {
    matchedCount: number;
    modifiedCount: number;
    upsertedId?: string;
};

export type UpdateManyResponse = {
    matchedCount: number;
    modifiedCount: number;
    upsertedId?: string;
};

export type DeleteResponse = {
    deletedCount: number;
};

export enum Collection {
    Users = "users",
    ChildAccounts = "childaccounts",
    Transactions = "transactions",
}
