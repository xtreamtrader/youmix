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
- [x] _**Refactor ~~ApiFeatures~~ renamed to ApiCrud (~~filtering, sorting, pagination,...~~ full CRUD supports with role validation, error handler, relations) ~~into a NestJS module~~ used Standalone Typescript Abstract Class instead**_
  - [ ] Refactor error handler to NestJs Filter Exception Module
- [ ] Refactor config files into a NestJS Module
- [ ] Refactor util files into a NestJS Module
- [ ] Add Swagger for API documentation
- [ ] Write test -\_-

## In Progress

- [x] ~~Working on project features~~ _**DONE**_
- [ ] Working on notification features
- [ ] Working on workplace features

## API Endpoints

| No  | Endpoint | Description | Body | Note |
| :-: | -------- | ----------- | ---- | ---- |
| Auth <i>(_)</i>
| 1 | POST /auth/signup| Create new account | AuthSignUpDto|
| 2 | POST /auth/signin| Login to retrive accesstoken and refreshtoken | AuthSignInDto|
| 3 | POST /auth/refreshtoken| Use refreshtoken to get a new access token | RfreshTokenDto|
| 4 | GET /auth/verification/:userId/:verificationToken| Verify account (to ensure user's email is accessible but its owner) |
| 5 | POST /auth/resetpassword| Generate a new verification token and send it under a reset link to user's email | RequestResetPasswordDto
| 6 | POST /auth//verification/:userId/:token| Saving new password after validating for given verification token | ResetPasswordDto
| User <i>(_)</i>
| 7 | GET /users| Get all users || Admin only
| 8 | GET /users/:id| Get user || Admin only
| 9 | GET /me| Get all users || Owner
| 10 | PATCH /users/:id | Update user information (password includes) || Admin only
| 11 | DELETE /users/:id| Delete user || Owner
| Profile <i>(_)</i>
| 12 | GET /profiles?[allow_query] | Get all profiles ||
| 13 | GET /profiles/:username | Get profile by username ||
| 14 | PATCH /profiles | Update profile || Owner only
| Project <i>(_)</i>
| 15 | GET /projects?[allow_query] | Get all projects with owner member || <i>(_) AccessMembersListOption</i>
| 16 | GET /projects/:id | Get single project with visible members |
| 17 | POST /projects | Create new project | CreateProjectDto
| 18 | PATCH /projects/:id | Update exising project | UpdateProjectDto | Owner only
| 19 | DELETE /projects/:id | Delete existing project | | Owner only
| ProjectMembers <i>(_)</i>
| 20 | GET /projects/:id/members?[allow_query] | Get all profile detail of accessable members | | <i>(\*) AccessMembersListOption</i>
| 21 | GET /projects/:id/members/:username | Get <i>active member</i> of one project with profile data|
| 22 | POST /projects/:id/members/:username/invite | Invite user to join in the project | | Role: <i>Active member</i>
| 23 | POST /projects/:id/members/join | Join request from normal user| |
| 24 | POST /projects/:id/members/accept | Invited user accepts to join the project | |
| 25 | POST /projects/:id/members/approve | Approve normal user's request to join | | Owner only
| 26 | POST /projects/:id/members/:username/transfer | Tranfer ownership to user| | Owner only
| 27 | DELETE /projects/:id/members | Leave project| | All but Owner
| 28 | DELETE /projects/:id/members/:username | Kick user out of project | | Owner only

## License

Nest is [MIT licensed](LICENSE).
