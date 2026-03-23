import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let scene, camera, renderer, avatar;
let recognition, mappingData = {};
let isLoaded = false;
let isAnimating = false;
let animationQueue = [];
let stopSignal = false; // NEW: To kill animation immediately

const container = document.getElementById('canvas-container');
const speechBox = document.getElementById('speech-box');
const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const langSelect = document.getElementById('lang-select');

async function init() {
    try {
        const response = await fetch('./mapping.json');
        mappingData = await response.json();
    } catch (error) {
        console.error("❌ Mapping error:", error);
    }

    scene = new THREE.Scene();
    
    // CAMERA: Centered and pulled back so she fits the window
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.3, 3.0); 
    camera.lookAt(0, 1.1, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 1.5));
    
    loadAvatar();
    setupSpeech();
    animate();

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

function loadAvatar() {
    new GLTFLoader().load('./models/avatar.glb', (gltf) => {
        avatar = gltf.scene;
        avatar.rotation.y = Math.PI; 
        avatar.position.set(0, 0, 0); // Keep her at the floor origin
        scene.add(avatar);
        isLoaded = true;
        resetToTPose();
    });
}

function setupSpeech() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    recognition = new SpeechRecognition();
    recognition.continuous = true;

    startBtn.onclick = () => {
        stopSignal = false; 
        recognition.start();
        speechBox.innerText = "Listening...";
    };

    stopBtn.onclick = () => {
        stopSignal = true; // Kills current loop
        recognition.stop();
        animationQueue = []; // Clears waiting words
        isAnimating = false;
        resetToTPose();
        speechBox.innerText = "Stopped.";
    };

    recognition.onresult = (event) => {
        const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
        const words = transcript.replace(/[.,!?]/g, '').split(' ');
        words.forEach(word => { if (mappingData[word]) animationQueue.push(word); });
        processQueue();
    };
}

async function processQueue() {
    if (isAnimating || animationQueue.length === 0) return;
    isAnimating = true;
    const currentWord = animationQueue.shift();
    await playAnimation(currentWord);
    await new Promise(res => setTimeout(res, 200)); 
    isAnimating = false;
    processQueue();
}

async function playAnimation(word) {
    return new Promise(async (resolve) => {
        try {
            const response = await fetch(`./animations/${mappingData[word]}`);
            const frames = await response.json();
            let currentFrame = 0;

            const timer = setInterval(() => {
                // Check if Stop Button was pressed or animation ended
                if (currentFrame >= frames.length || stopSignal) {
                    clearInterval(timer);
                    resetToTPose();
                    resolve();
                    return;
                }
                applyFrame(frames[currentFrame]);
                currentFrame++;
            }, 1000 / 30);
        } catch (e) { resolve(); }
    });
}

function applyFrame(frameData) {
    if (!avatar) return;

    for (const [boneName, rot] of Object.entries(frameData)) {
        const bone = avatar.getObjectByName(boneName);
        if (!bone) continue;

        // 🛑 BONE FILTER: 
        // Do NOT let the JSON move the Hips or Spine or Legs.
        // This stops the "bending backwards" and "laying down" issues.
        const forbidden = ["Hips", "Spine", "Spine1", "Spine2", "LeftUpLeg", "RightUpLeg"];
        
        if (forbidden.includes(boneName)) {
            bone.rotation.set(0, 0, 0); 
            if (boneName === "Hips") bone.position.set(0, 0, 0); // Freeze position
        } else {
            // Apply rotations only to Arms, Hands, and Neck
            bone.rotation.set(rot.x || 0, rot.y || 0, rot.z || 0);
        }
    }
    avatar.traverse(c => { if (c.isSkinnedMesh) c.skeleton.update(); });
}

function resetToTPose() {
    if (!avatar) return;
    avatar.traverse(n => {
        if (n.isBone) {
            n.rotation.set(0, 0, 0);
            if (n.name === "Hips") n.position.set(0, 0, 0);
        }
    });
}

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

init();