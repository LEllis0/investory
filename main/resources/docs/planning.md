# Planning

## Team Roles
* Jack - Backend, Deployment
* Jamie - UI/UX, Frontend
* Soma - Full Stack, Database
* Lewis - Financial Data, Full Stack

## Stack

* Frontend - TBD
* Backend - Expressjs
* Database - MySQL

#### Source Control - BitBucket
We will be using a single repository, because:
* Simpler to use in the short term
* We don't have to manage permissions of two individual repositories
* We can create branches to avoid overlapping (main, staging, development) that will be locked down to require pull requests, so developers don't step on each others toes


#### Project Planning - Jira
We will use Jira due to its integration with BitBucket and Kanban planning that is simple to use and understand.


#### Deployment - Windows Server AWS EC2
We will use an AWS EC2 instance running Windows Server.

We will use the domain "financeportfolio.live" and the Windows Server will have an NGINX reverse proxy so that we can have the following deployments:

* https://financeportfolio.live - Production Frontend
* https://api.financeportfolio.live - Production Backend
* https://staging.financeportfolio.live - Staging Frontend
* https://api-staging.financeportfolio.live - Staging Backend

We will use a similar system to blue/green deploys, to ensure production uptime throughout deploys. Here is the deploy process:
1. Ensure the fallback server is started
2. Stop the production server
3. Update the production server code
4. Relaunch the production server
5. Stop the fallback server
6. Update the fallback server code
7. Relaunch the fallback server
