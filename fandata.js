// webtask to parse @fandata_b tweets and generate google calendar events
//
// expects json input as:
// {
//   'content': <tweet content>,
//   'url': <original tweet url>
// }
//
// example tweet:
// [우주소녀]팬싸인회 #일시:17.3.1 7:00pm #장소:그랜드프라자 청주호텔 직지홀 #추첨:100명 #판매처:영풍문고 청주점 #판매기간:2.26~2.28 #당첨발표:2.28 pm10:00 영풍문고 공지 #미기불참

var google = require('googleapis');
var calendar = google.calendar('v3');

function parseTweet(tweet) {
  var pattern = /^\[(.+)\].*#일시:(\d+)\.(\d+)\.(\d+)\s+(\d+):(\d+)\s?(am|pm)\s+#장소:(.+)\s+#추첨/
  var m = tweet.match(pattern);
  if (m == null) {
    return null
  }

  if (m[2].length == 4) {
    var year = m[2];
  } else {
    year = '20' + m[2];
  }
  var month = m[3];
  if (month.length == 1) {
    month = '0' + month;
  }
  var day = m[4];
  if (day.length == 1) {
    day = '0' + day;
  }
  var hour = Number(m[5]);
  if (m[7] == 'pm') {
    hour += 12;
  }
  hour = hour % 24;
  hour = hour.toString()
  if (hour.length == 1) {
    hour = '0' + hour;
  }
  var minute = m[6];

  // make iso3601 string so js Date handles the timezone properly (everything is localised to KST)
  var isodate = year + '-' + month + '-' + day + 'T' + hour.toString() + ':' + minute + ':00+09:00';
  startDate = new Date(isodate);
  endDate = new Date(startDate.getTime());
  endDate.setHours(startDate.getHours() + 1);
  return {
    'summary': m[1] + ' 팬사인',
    'location': m[8],
    'start': {'dateTime': startDate.toISOString()},
    'end': {'dateTime': endDate.toISOString()},
    'description': tweet
  }
}

module.exports = function (ctx, cb) {
  if (ctx.body == null) {
    return cb('invalid request');
  }

  var jwtClient = new google.auth.JWT(
    ctx.secrets.client_email,
    null,
    ctx.secrets.private_key,
    ['https://www.googleapis.com/auth/calendar'],
    null
  );

  var tweet = ctx.body['content']
  var event = parseTweet(tweet);
  if (event == null) {
    return cb('tweet did not contain an event')
  }

  event['description'] += '\n\n' + ctx.body['url']

  jwtClient.authorize(function (error, tokens) {
    if (error) return cb(error);

    // insert this event into our calendar
    // TODO: check to see if event already exists?
    calendar.events.insert({
      auth: jwtClient,
      calendarId: 'elv95ucqi050e6c7qear0ulqh0@group.calendar.google.com',
      resource: event
    }, function(error, response) {
      if (error) return cb(error);
      return cb(null, response);
    });
  });
}
