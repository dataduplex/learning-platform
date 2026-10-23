// Runs in the cloudfront-js-1.0 runtime: ES5 syntax, no modules. A template: the
// empty list below stands for the deployed prefixes.
var COURSE_PREFIXES = [];

function redirectTo(location) {
  return {
    statusCode: 301,
    statusDescription: 'Moved Permanently',
    headers: { location: { value: location } }
  };
}

function coursePrefixOf(uri) {
  for (var i = 0; i < COURSE_PREFIXES.length; i += 1) {
    var prefix = COURSE_PREFIXES[i];
    if (uri === prefix || uri.indexOf(prefix + '/') === 0) return prefix;
  }
  return null;
}

function routeCourse(request) {
  var uri = request.uri;
  var prefix = coursePrefixOf(uri);
  if (prefix === null) return request;
  if (uri === prefix) return redirectTo(prefix + '/');
  if (uri.charAt(uri.length - 1) === '/') {
    request.uri = uri + 'index.html';
    return request;
  }
  var lastSegment = uri.slice(uri.lastIndexOf('/') + 1);
  if (lastSegment.indexOf('.') === -1) return redirectTo(uri + '/');
  return request;
}
