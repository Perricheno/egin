import { MigrationInterface, QueryRunner } from 'typeorm';

export class MarketplaceLaunchFields1712500002000
  implements MigrationInterface
{
  name = 'MarketplaceLaunchFields1712500002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "marketplace_listings"
      ADD COLUMN "imageUrl" character varying
    `);
    await queryRunner.query(`
      ALTER TABLE "marketplace_listings"
      ADD COLUMN "deliveryAvailable" boolean NOT NULL DEFAULT false
    `);
    await queryRunner.query(`
      ALTER TABLE "marketplace_listings"
      ADD COLUMN "deliveryNotes" character varying
    `);
    await queryRunner.query(`
      ALTER TABLE "marketplace_listings"
      ADD COLUMN "freshnessDays" integer
    `);
    await queryRunner.query(`
      ALTER TABLE "marketplace_listings"
      ADD COLUMN "storageLifeDays" integer
    `);
    await queryRunner.query(`
      ALTER TABLE "marketplace_listings"
      ADD COLUMN "storageConditions" text
    `);
    await queryRunner.query(`
      ALTER TABLE "marketplace_listings"
      ADD COLUMN "recommendedRegion" character varying
    `);
    await queryRunner.query(`
      ALTER TABLE "marketplace_listings"
      ADD COLUMN "saleModel" character varying NOT NULL DEFAULT 'lead_chat'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "marketplace_listings"
      DROP COLUMN "saleModel"
    `);
    await queryRunner.query(`
      ALTER TABLE "marketplace_listings"
      DROP COLUMN "recommendedRegion"
    `);
    await queryRunner.query(`
      ALTER TABLE "marketplace_listings"
      DROP COLUMN "storageConditions"
    `);
    await queryRunner.query(`
      ALTER TABLE "marketplace_listings"
      DROP COLUMN "storageLifeDays"
    `);
    await queryRunner.query(`
      ALTER TABLE "marketplace_listings"
      DROP COLUMN "freshnessDays"
    `);
    await queryRunner.query(`
      ALTER TABLE "marketplace_listings"
      DROP COLUMN "deliveryNotes"
    `);
    await queryRunner.query(`
      ALTER TABLE "marketplace_listings"
      DROP COLUMN "deliveryAvailable"
    `);
    await queryRunner.query(`
      ALTER TABLE "marketplace_listings"
      DROP COLUMN "imageUrl"
    `);
  }
}
