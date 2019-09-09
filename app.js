document.body.onclick = init;
console.log("loaded");
let printPitch = false;
function init() {
  console.log("inited");
  document.body.onclick = null;

  // set up forked web audio context, for multiple browsers
  // window. is needed otherwise Safari explodes

  let audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  let voiceSelect = document.getElementById("voice");
  let source;
  let stream;
  let detectedFreq = 0;


  //set up the different audio nodes we will use for the app
  let analyser = audioCtx.createAnalyser();
  analyser.minDecibels = -90;
  analyser.maxDecibels = -10;
  analyser.smoothingTimeConstant = 0.85;

  let toneGen = audioCtx.createOscillator();
 
  window.toneGen = toneGen;
  window.audioCtx = audioCtx;

  let fftSize = 512;

  let yinDetector = getYinDetector({threshold: .5, probabilityThreshold: .5, sampleRate: audioCtx.sampleRate});
  let macleodDetector = getMacLeodDetector({bufferSize: fftSize, sampleRate: audioCtx.sampleRate});
  let lastFreq = 0;
  var arrayOf = n => Array.from(new Array(n), () => 0);
  let pitchAvg = arrayOf(10);
  let pitchInd = 0;


  // set up canvas context for visualizer
  let canvas = document.querySelector('#visCanvas');
  let canvasCtx = canvas.getContext("2d");
  canvas.setAttribute('width',500);

  let drawVisual;

  //main block for doing the audio recording
  if (navigator.mediaDevices.getUserMedia) {
     console.log('getUserMedia supported.');
     let constraints = {audio: true}
     navigator.mediaDevices.getUserMedia (constraints)
        .then(
          function(stream) {
             source = audioCtx.createMediaStreamSource(stream);
             // toneGen.connect(analyser);
             source.connect(analyser);
             // analyser.connect(audioCtx.destination);
             toneGen.start();
             visualize();
        })
        .catch( function(err) { console.log('The following gUM error occured: ' + err);})
  } else {
     console.log('getUserMedia not supported on your browser!');
  }

  function visualize() {
    WIDTH = canvas.width;
    HEIGHT = canvas.height;

    analyser.fftSize = fftSize;
    let bufferLengthAlt = analyser.frequencyBinCount;
    console.log(bufferLengthAlt);
    let dataArrayAlt = new Uint8Array(bufferLengthAlt);
    let waveformArray = new Float32Array(fftSize);

    canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);

    let drawAlt = function() {
      requestAnimationFrame(drawAlt);

      analyser.getByteFrequencyData(dataArrayAlt);
      analyser.getFloatTimeDomainData(waveformArray);
      let mPitch = macleodDetector(waveformArray);
      let yPitch = yinDetector(waveformArray);
      if(printPitch){
        console.log("pitch", mPitch.freq, mPitch.probability);
      }

      canvasCtx.fillStyle = 'rgb(0, 0, 0)';
      canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);


      if(mPitch.probability > 0.5) {
        let lastFreq = mPitch.freq;
        pitchAvg[pitchInd++ % pitchAvg.length] = lastFreq;
      }
      let avg = pitchAvg.reduce((a, b) => a+b) / pitchAvg.length;
      let freqY = Math.log2(avg) / Math.log2(22050) * HEIGHT;
      canvasCtx.fillStyle = 'rgb(50, 200, 50)';
      let voxBarWeight = 3;
      canvasCtx.fillRect(0, freqY-voxBarWeight, WIDTH, voxBarWeight*2);

      let barWidth = (WIDTH / bufferLengthAlt) * 2.5;
      let barHeight;
      let x = 0;

      for(let i = 0; i < bufferLengthAlt; i++) {
        barHeight = dataArrayAlt[i];

        canvasCtx.fillStyle = 'rgb(' + (barHeight+100) + ',50,50)';
        canvasCtx.fillRect(x,HEIGHT-barHeight/2,barWidth,barHeight/2);

        x += barWidth + 1;
      }
    };

    drawAlt();
  }
}