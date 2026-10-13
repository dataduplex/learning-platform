// Runs in the cloudfront-js-1.0 runtime: ES5 syntax, no modules.
var COURSE_PREFIX = '/engineer/learning/ai/math';

function redirectTo(location) {
  return {
    statusCode: 301,
    statusDescription: 'Moved Permanently',
    headers: { location: { value: location } }
  };
}

function routeCourse(request) {
  var uri = request.uri;
  if (uri === COURSE_PREFIX) return redirectTo(COURSE_PREFIX + '/');
  if (uri.indexOf(COURSE_PREFIX + '/') !== 0) return request;
  if (uri.charAt(uri.length - 1) === '/') {
    request.uri = uri + 'index.html';
    return request;
  }
  var lastSegment = uri.slice(uri.lastIndexOf('/') + 1);
  if (lastSegment.indexOf('.') === -1) return redirectTo(uri + '/');
  return request;
}
