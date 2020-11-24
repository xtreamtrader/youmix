import {MigrationInterface, QueryRunner} from "typeorm";

export class CreateProjectCas1603616447028 implements MigrationInterface {
    name = 'CreateProjectCas1603616447028'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "project" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "name" character varying NOT NULL, "major" text array, "expertises" text, "description" jsonb, "close_at" TIMESTAMP NOT NULL, "status" character varying NOT NULL, CONSTRAINT "PK_4d68b1358bb5b766d3e78f32f57" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "project_member" ("created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "role" character varying NOT NULL, "project_id" uuid NOT NULL, "username" character varying NOT NULL, CONSTRAINT "PK_c844ca053f932f538be195aa4df" PRIMARY KEY ("project_id", "username"))`);
        await queryRunner.query(`ALTER TABLE "project_member" ADD CONSTRAINT "FK_bb9708ea12be88d401571588ced" FOREIGN KEY ("username") REFERENCES "profile"("username") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "project_member" ADD CONSTRAINT "FK_aaef76230abfcdf30adb15d0be8" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "project_member" DROP CONSTRAINT "FK_aaef76230abfcdf30adb15d0be8"`);
        await queryRunner.query(`ALTER TABLE "project_member" DROP CONSTRAINT "FK_bb9708ea12be88d401571588ced"`);
        await queryRunner.query(`DROP TABLE "project_member"`);
        await queryRunner.query(`DROP TABLE "project"`);
    }

}
