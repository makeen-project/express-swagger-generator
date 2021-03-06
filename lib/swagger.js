/**
 * Created by GROOT on 3/27 0027.
 */
/** @module index */
'use strict';

// Dependencies
const fs = require('fs');
const glob = require('glob');
const path = require('path');
const parser = require('swagger-parser');
const swaggerHelpers = require('./swagger-helpers');
const doctrineFile = require('doctrine-file');
const swaggerUi = require('swagger-ui-express');
/**
 * Parses the provided API file for JSDoc comments.
 * @function
 * @param {string} file - File to be parsed
 * @returns {object} JSDoc comments
 * @requires doctrine
 */
function parseApiFile(file) {
    const content = fs.readFileSync(file, 'utf-8');

    let comments = doctrineFile.parseFileContent(content, {unwrap: true, sloppy: true});

    return comments;
}

function parseRoute(str) {
    let split = str.split(" ")

    return {
        method: split[0].toLowerCase() || 'get',
        uri: split[1] || ''
    }
}
function parseField(str) {
    let split = str.split(".")
    return {
        name: split[0],
        parameter_type: split[1] || 'get',
        required: split[2] && split[2] === 'required' || false
    }
}
function parseType(obj) {

    return obj.name || 'string'
}
function parseReturn(tags) {
    let rets = {}
    for (let i in tags) {
        if (tags[i]['title'] == 'returns' || tags[i]['title'] == 'return') {
            let description = tags[i]['description'].split("-")
            rets[description[0]] = {description: description[1]}
        }
    }
    return rets
}
function parseSecurity(tags) {
    let security = [];
    for (let i in tags) {
        if (tags[i]['title'] == 'security') {
            let description = tags[i]['description'].split("-");
            let securityType = {};
            securityType[description[0]] = [];
            security.push(securityType);
        }
    }
    return security
}

function parseDescription(obj) {
    return obj.description || ''
}
function parseTag(tags) {
    for (var i in tags) {
        if (tags[i]['title'] == 'group') {
            return tags[i]['description'].split("-")
        }
    }
    return ['default', '']
}

function fileFormat(comments) {

    let route, parameters = {}, params = [], tags = [];
    for (let i in comments) {
        let desc = parseDescription(comments);
        if (i == 'tags') {
            for (let j in comments[i]) {
                let title = comments[i][j]['title']
                if (title == 'route') {
                    route = parseRoute(comments[i][j]['description'])
                    let tag = parseTag(comments[i])
                    parameters[route.uri] = {}
                    parameters[route.uri][route.method] = {}
                    parameters[route.uri][route.method]['parameters'] = []
                    parameters[route.uri][route.method]['description'] = desc
                    parameters[route.uri][route.method]['tags'] = [tag[0]]
                    tags.push({
                        name: tag[0],
                        description: tag[1]
                    })
                }
                if (title == 'param') {
                    let field = parseField(comments[i][j]['name'])
                    params.push({
                        name: field.name,
                        in: field.parameter_type,
                        description: comments[i][j]['description'],
                        required: field.required,
                        type: parseType(comments[i][j]['type'])
                    })
                }
            }
            parameters[route.uri][route.method]['parameters'] = params;
            parameters[route.uri][route.method]['responses'] = parseReturn(comments[i]);
            parameters[route.uri][route.method]['security'] = parseSecurity(comments[i]);
        }
    }
    return {parameters: parameters, tags: tags}
}

/**
 * Filters JSDoc comments
 * @function
 * @param {object} jsDocComments - JSDoc comments
 * @returns {object} JSDoc comments
 * @requires js-yaml
 */
function filterJsDocComments(jsDocComments) {
    return jsDocComments.filter(function (item) {
        return item.tags.length > 0
    })
}

/**
 * Converts an array of globs to full paths
 * @function
 * @param {array} globs - Array of globs and/or normal paths
 * @return {array} Array of fully-qualified paths
 * @requires glob
 */
function convertGlobPaths(base, globs) {
    return globs.reduce(function (acc, globString) {
        var globFiles = glob.sync(path.resolve(base, globString));
        return acc.concat(globFiles);
    }, []);
}

/**
 * Generates the swagger spec
 * @function
 * @param {object} options - Configuration options
 * @returns {array} Swagger spec
 * @requires swagger-parser
 */
module.exports = function (app) {

    return function (options) {
        /* istanbul ignore if */
        if (!options) {
            throw new Error('\'options\' is required.');
        } else /* istanbul ignore if */ if (!options.swaggerDefinition) {
            throw new Error('\'swaggerDefinition\' is required.');
        } else /* istanbul ignore if */ if (!options.files) {
            throw new Error('\'files\' is required.');
        }

        // Build basic swagger json
        var swaggerObject = swaggerHelpers.swaggerizeObj(options.swaggerDefinition);
        var apiFiles = convertGlobPaths(options.basedir, options.files);

        // Parse the documentation in the APIs array.
        for (var i = 0; i < apiFiles.length; i = i + 1) {
            var comments = parseApiFile(apiFiles[i]);
            var comments = filterJsDocComments(comments);

            for (let i in comments) {
                var parsed = fileFormat(comments[i])
                swaggerHelpers.addDataToSwaggerObject(swaggerObject, [{paths: parsed.parameters, tags: parsed.tags}]);
            }
        }

        parser.parse(swaggerObject, function (err, api) {
            if (!err) {
                swaggerObject = api;
            }
        });
        app.use('/api-docs.json', function (req, res) {
            res.json(swaggerObject);
        });
        app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerObject));

        return swaggerObject;
    }
};
