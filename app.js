var express = require('express');
var app = express();
var _ = require('lodash');
var Jimp = require("jimp");
var AWS = require('aws-sdk');
var fs = require('fs');
var q = require('q');
var randomstring = require("randomstring");
var config =  require(appRoot + '/config').christmas;
// console.log(config);
AWS.config.update({
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey
});

var s3Stream = require('s3-upload-stream')(new AWS.S3());

function stream_to_s3(image) {
    return q.promise(function(resolve, reject) {
        var upload = s3Stream.upload({
            Bucket: 'neeeds amazon AWS bucket',
            Key: 'tmp/needs amazon link' + image,
            ContentType: 'image/jpg'
        });
        upload.on('error', function(error) {
            console.log("S3 ERROR:", error);
            reject(error);
        });
        upload.on('uploaded', function(details) {
            // console.log('Image uploaded: ' + details.Location);
            resolve({ url: details.Location });
        });
        fs.createReadStream('./' + image).pipe(upload);
    });
}

app.get('/portrait', function(req, res) {

    var userPicture;
    var familyPicture;
    var user;

    userPicture = req.query.picture;
    familyPicture = req.query.familypicture;

    var pic_to_send = ("pic_to_send" + randomstring.generate() + ".jpg");

    function jimp_image(url) {
        var deferred = q.defer();
        Jimp.read(url, function(err, image) {
            if (err) {
                deferred.reject(err);
            } else {
                deferred.resolve(image);
            }
        });
        return deferred.promise;
    }

    var promises = [jimp_image(userPicture), jimp_image(familyPicture)];

    q.all(promises).then(function(images) {
        if (userPicture == "a faceless picture must be inserted here") {
            images[0].resize(200, 150);
        } else {
            images[0].cover(200, 150);
        }
        var deferred = q.defer();
        images[1].composite(images[0], 210, 315).write(pic_to_send, function(err, image) {
             if (err) {
                deferred.reject(err);
            } else {
                deferred.resolve(image);
            }
        });
        return  deferred.promise;
    }).then(function(data) {
        return stream_to_s3(pic_to_send);
    }).then(function(data) {
        // console.log("data" + data.url);
        return res.json({ url: data.url });
    }).catch(function(err) {
        console.log(err.stack);
        res.sendStatus(400);
    }).finally(function() {
        fs.unlink(pic_to_send, function(err) {
            if (err) {
                console.log(err.stack);
            } else {
                console.log("image deleted successfully");
            }
        });
    });
});

// app.listen(4000);
module.exports = app;

