const express = require('express')
const app = express()
const port = 3004
const config = require('./config/config.json')
const requestHandler = require('./util/requestHandler.js')
const security = require('./security/security.js')

app.get('/:uinfin', function(req, res){
    var uinfin = req.params.uinfin; // From SingPass Mobile
    var clientId = req.query.clientId; // From SingPass Mobile
    var state = req.query.state; // From SingPass Mobile
    var txnNo = req.query.txnNo; // From SingPass Mobile

    //From config
    var callback = config[clientId].callback;
    var appSecret = config[clientId].appSecret;
    var scope = config[clientId].scope;
    var publicKey = config[clientId].publicKey;

    var personSampleRequest = config.personSampleRequest;
    var personSampleRequestPath = personSampleRequest.requestPath +"/"+uinfin+"?attributes="+scope+"&state="+state+"&txnNo="+txnNo;

    console.log("Mock MyInfo - ", personSampleRequest);

    //Calling sandbox person sample api to get person data
    var personSample;
    requestHandler.getHttpsResponse(personSampleRequest.domain, personSampleRequestPath, personSampleRequest.headers, personSampleRequest.method, "")
      .then(result => {
        if(result){
          personSample = JSON.parse(result.msg);

          // Encrypting person data
          console.log("Mock MyInfo - Encrypting...");
          return security.encryptCompactJWE(publicKey, personSample.identity);
        }
        else{
          throw "No result.";
        }
      })
      .then(encryptedData => {
        if(encryptedData){
          personSample.identity = encryptedData;
          console.log("Mock MyInfo - consolidatedResponse: ", personSample);

          // Format callback url to call partner's webhook
          var pathArr = callback.split('/');
          var domain = pathArr[0];
          var tempArr = domain.split(':');
          domain = tempArr[0];
          var port = tempArr[1];
          var requestPath = "/" + pathArr[1];

          var request = {
            "domain": domain,
            "requestPath": requestPath,
            "port": port,
            "headers": {
              "content-type": "application/json",
              "X-API-KEY": appSecret
            },
            "method": "POST"
          };

          console.log("Mock MyInfo - Pushing data...");
          return requestHandler.getHttpResponse(request.domain, request.port, request.requestPath, request.headers, request.method, JSON.stringify(personSample))
        }
        else{
          throw "No result.";
        }
      })
      .then(result => {
        if(result){
          console.log("Mock MyInfo -",result);
          res.send(
            {
              "code": 200,
              "message": "OK"
            }
          );
        }
        else{
          res.send(
            {
              "code": 500,
              "message": "error"
            }
          );
        }
      })
      .catch(error => {
        console.log("Mock MyInfo - Error:",error);
        res.status(500)
          .send(
          {
            "code": 500,
            "message": "error"
          }
        );
      })
});

app.listen(port, () => console.log(`Mock MyInfo server listening on port ${port}!`))


//Formulate Response
function formulateResponse(state, timestamp, txnNo, personData) {
  var result = {};
  result = {
    "state": {
      "value": state
    },
    "timestamp": {
      "value": timestamp
    },
    "txnNo": {
      "value": txnNo
    },
    "identity": personData

  };

  return result;
}