import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProjectSearching1606138118611 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add search_weights column
    await queryRunner.query(
      `ALTER TABLE "project" ADD "search_weights" tsvector`,
    );

    // Update existed data with new search_weights column
    await queryRunner.query(
      `update project set search_weights = setweight(to_tsvector(coalesce(unaccent(name), '')), 'A') || 
                                                setweight(to_tsvector(coalesce(array_to_string(major, ','), '')), 'B') || 
                                                setweight(to_tsvector(coalesce(unaccent(expertises), '')), 'B') || 
                                                setweight(to_tsvector(coalesce(unaccent((description->'bio')::text), '')), 'D')|| 
                                                setweight(to_tsvector(coalesce(unaccent((description->'summary')::text), '')), 'D')|| 
                                                setweight(to_tsvector(coalesce(unaccent((description->'requirements')::text), '')), 'D')`,
    );

    // Create gin index on search_weights column
    await queryRunner.query(
      `CREATE INDEX search_weights_project_idx
        ON project
        USING GIN (search_weights);
        `,
    );


    // Create function to generate new search_weights value from targetted row
    await queryRunner.query(
      `CREATE FUNCTION project_tsvector_search_trigger() RETURNS trigger AS $$
         begin
          new.search_weights := setweight(to_tsvector(coalesce(unaccent(new.name), '')), 'A') || 
                                    setweight(to_tsvector(coalesce(array_to_string(new.major, ','), '')), 'B') || 
                                    setweight(to_tsvector(coalesce(unaccent(new.expertises), '')), 'B') || 
                                    setweight(to_tsvector(coalesce(unaccent((new.description->'bio')::text), '')), 'D')|| 
                                    setweight(to_tsvector(coalesce(unaccent((new.description->'summary')::text), '')), 'D')|| 
                                    setweight(to_tsvector(coalesce(unaccent((new.description->'requirements')::text), '')), 'D');
          return new;
        end
        $$ LANGUAGE plpgsql;
      `,
    );

    // Create trigger on insert or update to auto generate search_weights value
    await queryRunner.query(
      `CREATE TRIGGER tsvector_search_project_update BEFORE INSERT OR UPDATE
          ON project FOR EACH ROW EXECUTE PROCEDURE project_tsvector_search_trigger();`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "search_weights_project_idx"`);
  }
}
