import { MigrationInterface, QueryRunner } from "typeorm";

export class Auto1775599167496 implements MigrationInterface {
    name = 'Auto1775599167496'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chats" DROP CONSTRAINT "FK_chats_createdBy"`);
        await queryRunner.query(`ALTER TABLE "chat_participants" DROP CONSTRAINT "FK_chat_participants_chatId"`);
        await queryRunner.query(`ALTER TABLE "chat_participants" DROP CONSTRAINT "FK_chat_participants_userId"`);
        await queryRunner.query(`ALTER TABLE "chat_messages" DROP CONSTRAINT "FK_chat_messages_chatId"`);
        await queryRunner.query(`ALTER TABLE "chat_messages" DROP CONSTRAINT "FK_chat_messages_senderId"`);
        await queryRunner.query(`ALTER TABLE "service_listings" DROP CONSTRAINT "FK_service_listings_providerUserId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_chats_createdBy"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_chats_channelKey"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_chat_participants_userId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_chat_participants_chatId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_chat_messages_senderId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_chat_messages_chatId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_farm_plots_geometry"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_farm_plots_userId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_marketplace_listings_farmerId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_orders_userId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_order_items_orderId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_service_listings_providerUserId"`);
        await queryRunner.query(`ALTER TABLE "farm_plots" ADD "plantingDate" date`);
        await queryRunner.query(`ALTER TABLE "marketplace_listings" ADD "visibilityStatus" "public"."marketplace_listings_visibilitystatus_enum" NOT NULL DEFAULT 'visible'`);
        await queryRunner.query(`ALTER TABLE "marketplace_listings" ADD "competitionLevel" character varying`);
        await queryRunner.query(`ALTER TABLE "marketplace_listings" ADD "competitionScore" numeric`);
        await queryRunner.query(`ALTER TABLE "marketplace_listings" ADD "visibilityReason" text`);
        await queryRunner.query(`ALTER TABLE "marketplace_listings" ADD "recommendationStatus" "public"."marketplace_listings_recommendationstatus_enum"`);
        await queryRunner.query(`ALTER TABLE "marketplace_listings" ADD "recommendationTitle" text`);
        await queryRunner.query(`ALTER TABLE "marketplace_listings" ADD "recommendationMessage" text`);
        await queryRunner.query(`ALTER TABLE "marketplace_listings" ADD "recommendedActions" text`);
        await queryRunner.query(`ALTER TABLE "chats" ADD CONSTRAINT "UQ_813bfd5024b51e0f9e7f941fe85" UNIQUE ("channelKey")`);
        await queryRunner.query(`ALTER TABLE "service_listings" ALTER COLUMN "rating" SET DEFAULT '4.5'`);
        await queryRunner.query(`ALTER TABLE "chats" ADD CONSTRAINT "FK_dbf9815f3fd911c270e7a3c0fa1" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "chat_participants" ADD CONSTRAINT "FK_e16675fae83bc603f30ae8fbdd5" FOREIGN KEY ("chatId") REFERENCES "chats"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "chat_participants" ADD CONSTRAINT "FK_fb6add83b1a7acc94433d385692" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "chat_messages" ADD CONSTRAINT "FK_e82334881c89c2aef308789c8be" FOREIGN KEY ("chatId") REFERENCES "chats"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "chat_messages" ADD CONSTRAINT "FK_fc6b58e41e9a871dacbe9077def" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "service_listings" ADD CONSTRAINT "FK_e99a6bc4afb7636790a88a68c56" FOREIGN KEY ("providerUserId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "service_listings" DROP CONSTRAINT "FK_e99a6bc4afb7636790a88a68c56"`);
        await queryRunner.query(`ALTER TABLE "chat_messages" DROP CONSTRAINT "FK_fc6b58e41e9a871dacbe9077def"`);
        await queryRunner.query(`ALTER TABLE "chat_messages" DROP CONSTRAINT "FK_e82334881c89c2aef308789c8be"`);
        await queryRunner.query(`ALTER TABLE "chat_participants" DROP CONSTRAINT "FK_fb6add83b1a7acc94433d385692"`);
        await queryRunner.query(`ALTER TABLE "chat_participants" DROP CONSTRAINT "FK_e16675fae83bc603f30ae8fbdd5"`);
        await queryRunner.query(`ALTER TABLE "chats" DROP CONSTRAINT "FK_dbf9815f3fd911c270e7a3c0fa1"`);
        await queryRunner.query(`ALTER TABLE "service_listings" ALTER COLUMN "rating" SET DEFAULT 4.5`);
        await queryRunner.query(`ALTER TABLE "chats" DROP CONSTRAINT "UQ_813bfd5024b51e0f9e7f941fe85"`);
        await queryRunner.query(`ALTER TABLE "marketplace_listings" DROP COLUMN "recommendedActions"`);
        await queryRunner.query(`ALTER TABLE "marketplace_listings" DROP COLUMN "recommendationMessage"`);
        await queryRunner.query(`ALTER TABLE "marketplace_listings" DROP COLUMN "recommendationTitle"`);
        await queryRunner.query(`ALTER TABLE "marketplace_listings" DROP COLUMN "recommendationStatus"`);
        await queryRunner.query(`ALTER TABLE "marketplace_listings" DROP COLUMN "visibilityReason"`);
        await queryRunner.query(`ALTER TABLE "marketplace_listings" DROP COLUMN "competitionScore"`);
        await queryRunner.query(`ALTER TABLE "marketplace_listings" DROP COLUMN "competitionLevel"`);
        await queryRunner.query(`ALTER TABLE "marketplace_listings" DROP COLUMN "visibilityStatus"`);
        await queryRunner.query(`ALTER TABLE "farm_plots" DROP COLUMN "plantingDate"`);
        await queryRunner.query(`CREATE INDEX "IDX_service_listings_providerUserId" ON "service_listings" ("providerUserId") `);
        await queryRunner.query(`CREATE INDEX "IDX_order_items_orderId" ON "order_items" ("orderId") `);
        await queryRunner.query(`CREATE INDEX "IDX_orders_userId" ON "orders" ("userId") `);
        await queryRunner.query(`CREATE INDEX "IDX_marketplace_listings_farmerId" ON "marketplace_listings" ("farmerId") `);
        await queryRunner.query(`CREATE INDEX "IDX_farm_plots_userId" ON "farm_plots" ("userId") `);
        await queryRunner.query(`CREATE INDEX "IDX_farm_plots_geometry" ON "farm_plots" USING GiST ("geometry") `);
        await queryRunner.query(`CREATE INDEX "IDX_chat_messages_chatId" ON "chat_messages" ("chatId") `);
        await queryRunner.query(`CREATE INDEX "IDX_chat_messages_senderId" ON "chat_messages" ("senderId") `);
        await queryRunner.query(`CREATE INDEX "IDX_chat_participants_chatId" ON "chat_participants" ("chatId") `);
        await queryRunner.query(`CREATE INDEX "IDX_chat_participants_userId" ON "chat_participants" ("userId") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_chats_channelKey" ON "chats" ("channelKey") WHERE ("channelKey" IS NOT NULL)`);
        await queryRunner.query(`CREATE INDEX "IDX_chats_createdBy" ON "chats" ("createdBy") `);
        await queryRunner.query(`ALTER TABLE "service_listings" ADD CONSTRAINT "FK_service_listings_providerUserId" FOREIGN KEY ("providerUserId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "chat_messages" ADD CONSTRAINT "FK_chat_messages_senderId" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "chat_messages" ADD CONSTRAINT "FK_chat_messages_chatId" FOREIGN KEY ("chatId") REFERENCES "chats"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "chat_participants" ADD CONSTRAINT "FK_chat_participants_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "chat_participants" ADD CONSTRAINT "FK_chat_participants_chatId" FOREIGN KEY ("chatId") REFERENCES "chats"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "chats" ADD CONSTRAINT "FK_chats_createdBy" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
