### Express Swagger Middleware

#### Installation

```
npm i express-swagger-middleware --save-dev
```

#### Usage

```
const express = require('express');
const app = express();
const expressSwagger = require('express-swagger-middleware')(app);

let options = {
    swaggerDefinition: {
        info: {
            title: 'Swagger',
            version: '1.0.0',
        },
        basePath: '/v1',
        produces: [
            "application/json"
        ],
    },
    basedir: __dirname, //app absolute path
    files: ['./handle/*'] //Path to the API handle folder
};
expressSwagger(options)
app.listen(3000);
```

Open http://<app_host>:<app_port>/api-docs in your browser to view the documentation.

#### How to document the API

```
/**
 * This function comment is parsed by doctrine
 * @route GET /api
 * @group foo
 * @param {string} email.query.required - username or email
 * @param {string} password.query.required - user's password.
 * @returns {object} 200 - An array of user info
 * @returns {Error}  default - Unexpected error
 */
exports.foo = function() {}
```

#### More

This module is based on [swagger-ui-express](https://github.com/scottie1984/swagger-ui-express) and [Doctrine-File](https://github.com/researchgate/doctrine-file)