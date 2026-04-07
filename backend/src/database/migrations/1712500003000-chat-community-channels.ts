import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChatCommunityChannels1712500003000 implements MigrationInterface {
  name = 'ChatCommunityChannels1712500003000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "chats" ADD COLUMN "village" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "chats" ADD COLUMN "cropType" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "chats" ADD COLUMN "channelKey" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "chats" ADD COLUMN "channelLabel" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "chats" ADD COLUMN "isModerated" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_chats_channelKey" ON "chats" ("channelKey") WHERE "channelKey" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_chats_channelKey"`);
    await queryRunner.query(`ALTER TABLE "chats" DROP COLUMN "isModerated"`);
    await queryRunner.query(`ALTER TABLE "chats" DROP COLUMN "channelLabel"`);
    await queryRunner.query(`ALTER TABLE "chats" DROP COLUMN "channelKey"`);
    await queryRunner.query(`ALTER TABLE "chats" DROP COLUMN "cropType"`);
    await queryRunner.query(`ALTER TABLE "chats" DROP COLUMN "village"`);
  }
}
