import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
    credentials: {
        accessKeyId: process.env.AWS_ID || "",
        secretAccessKey: process.env.AWS_SECRET || "",
    },
    region: "us-east-1",
});

export const uploadObject = async (path: string, mimeType: string, data: Buffer) => {
    const params = {
        Bucket: process.env.AWS_BUCKET || "",
        Key: path,
        Body: data,
        ContentType: mimeType,
        ACL: "public-read",
    };

    const command = new PutObjectCommand(params);

    await s3.send(command);
};

export const deleteObject = async (path: string) => {
    const params = {
        Bucket: process.env.AWS_BUCKET || "",
        Key: path,
    };

    const command = new DeleteObjectCommand(params);

    await s3.send(command);
};
