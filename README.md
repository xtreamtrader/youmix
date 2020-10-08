**RESTful API service for a Team-making Platform, powered by [NestJS](https://github.com/nestjs/nest), required PostgreSQL (with simple native full-text search solution), Redis (for Revocable JWT Concept with short-living access token, long-living refresh token ), AWS S3, Mailgun, Sentry, etc...**

<p align="center">
  <img src="https://youmix-sg.s3-ap-southeast-1.amazonaws.com/logo.png" width="240" alt="youmix-logo" />
</p>

## Installation

Before you run the app, please make sure you have PostgreSQL, Redis service properly configured and run on your machine.

This project internally uses AWS S3 as a storage solution, Mailgun for email sending (the main purpose is to make the most of Mailgun and its provided services) and Sentry for error tracking, please make sure you can get access to these providers with your own API keys.

Transfer your API keys, database settings to `./config/*.example.yaml`, and rename these files to a non-example version (ex: default.example.yaml => default.yaml)

Create a new PostgreSQL database with the name `youmix` (or the name you specified in `./config` folder)

For the first time, you have to install all the dependencies:

```bash
$ npm install
```

## Running the app

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Seed

If you wish to seed some dummy data, please make sure you've already run migration (by once simply running `npm run start` or explicitly running this migration command `npm run typeorm:cli --migration:run`)

```bash
# Seed data
$ npm run seed:up

# Remove seeded data
$ npm run seed:down
```

## Test

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Todo
- [ ] Refactor ApiFeatures (filtering, sorting, pagination,...) into a NestJS module
- [ ] Refactor config files into a NestJS Module
- [ ] Refactor util files into a NestJS Module
- [ ] Add Swagger for API documentation
- [ ] Write test -_- 

## In Progress

- [ ] Working on project features
- [ ] Working on notification features
- [ ] Working on workplace features


## License

Nest is [MIT licensed](LICENSE).
