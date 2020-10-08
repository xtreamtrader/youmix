import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProfileSearching1601788182048 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION unaccent`);

    await queryRunner.query(
      `update profile set search_weights = setweight(to_tsvector(coalesce(unaccent(fullname), '')), 'A') ||
                                                setweight(to_tsvector(username), 'B') ||
                                                setweight(to_tsvector(coalesce(unaccent(bio), '')), 'C')`,
    );

    await queryRunner.query(
      `CREATE INDEX search_weights_idx
          ON profile
          USING GIN (search_weights);
    `,
    );

    await queryRunner.query(
      `CREATE FUNCTION profile_tsvector_search_trigger() RETURNS trigger AS $$
       begin
        new.search_weights := setweight(to_tsvector(coalesce(unaccent(new.fullname), '')), 'A') ||
                                setweight(to_tsvector(new.username), 'B') ||
                                setweight(to_tsvector(coalesce(unaccent(new.bio), '')), 'C');
        return new;
      end
      $$ LANGUAGE plpgsql;
    `,
    );

    await queryRunner.query(
      `CREATE TRIGGER tsvector_search_update BEFORE INSERT OR UPDATE
        ON profile FOR EACH ROW EXECUTE PROCEDURE profile_tsvector_search_trigger();`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // do some thing
  }
}
