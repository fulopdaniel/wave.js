import { IAnimation } from "./types";
import { Arcs, IArcsOptions } from "./animations/Arcs";
import { Circles, ICirclesOptions } from "./animations/Circles";
import { Cubes, ICubesOptions } from "./animations/Cubes";
import { Flower, IFlowerOptions } from "./animations/Flower";
import { Glob, IGlobOptions } from "./animations/Glob";
import { Lines, ILinesOptions } from "./animations/Lines";
import { Shine, IShineOptions } from "./animations/Shine";
import { Square, ISquareOptions } from "./animations/Square";
import { Turntable, ITurntableOptions } from "./animations/Turntable";
import { Wave as WaveAnimation, IWaveOptions } from "./animations/Wave";

export {
  IArcsOptions,
  ICirclesOptions,
  ICubesOptions,
  IFlowerOptions,
  IGlobOptions,
  ILinesOptions,
  IShineOptions,
  ISquareOptions,
  ITurntableOptions,
  IWaveOptions,
};

export type AudioElement =
  | HTMLAudioElement
  | {
      context: AudioContext;
      source: MediaElementAudioSourceNode | MediaStreamAudioSourceNode;
    };

export class Wave {
  public animations = {
    Arcs: Arcs,
    Circles: Circles,
    Cubes: Cubes,
    Flower: Flower,
    Glob: Glob,
    Lines: Lines,
    Shine: Shine,
    Square: Square,
    Turntable: Turntable,
    Wave: WaveAnimation,
  };
  private _activeAnimations: IAnimation[] = [];
  private _audioElement: HTMLAudioElement;
  private _canvasElement: HTMLCanvasElement;
  private _canvasContext: CanvasRenderingContext2D;
  private _audioContext: AudioContext;
  private _audioSource:
    | MediaElementAudioSourceNode
    | MediaStreamAudioSourceNode;
  private _audioAnalyser: AnalyserNode;
  private _muteAudio: boolean;
  private _interacted: boolean;
  private _snapshot: Uint8Array;
  private _isPaused: boolean;
  private _drawingManually: boolean;

  constructor(
    audioElement: AudioElement,
    canvasElement: HTMLCanvasElement,
    muteAudio: boolean = false
  ) {
    this._canvasElement = canvasElement;
    this._canvasContext = this._canvasElement.getContext("2d");
    this._muteAudio = muteAudio;
    this._interacted = false;
    this._snapshot = null;
    this._isPaused = false;
    this._drawingManually = false;

    if (audioElement instanceof HTMLAudioElement) {
      this._audioElement = audioElement;

      const isSafari = /^((?!chrome|android).)*safari/i.test(
        navigator.userAgent
      );
      if (isSafari) {
        const events = [
          "touchstart",
          "touchmove",
          "touchend",
          "mouseup",
          "click",
        ];
        events.forEach((event) => {
          document.body.addEventListener(event, () => this.connectAnalyser(), {
            once: true,
          });
        });
      } else {
        this._audioElement.addEventListener(
          "play",
          () => this.connectAnalyser(),
          { once: true }
        );
      }
    } else {
      this._audioContext = audioElement.context;
      this._audioSource = audioElement.source;
      this._audioAnalyser = this._audioContext.createAnalyser();
      this._play();
    }
  }

  private connectAnalyser(): void {
    if (this._interacted) return;

    this._interacted = true;
    this._audioContext = new AudioContext();
    this._audioSource = this._audioContext.createMediaElementSource(
      this._audioElement
    );
    this._audioAnalyser = this._audioContext.createAnalyser();
    this._play();
  }

  private _play(): void {
    this._audioSource.connect(this._audioAnalyser);
    if (!this._muteAudio) {
      this._audioSource.connect(this._audioContext.destination);
    }
    this._audioAnalyser.smoothingTimeConstant = 0.85;
    this._audioAnalyser.fftSize = 1024;
    let audioBufferData = new Uint8Array(this._audioAnalyser.frequencyBinCount);
    this._snapshot = new Uint8Array(this._audioAnalyser.frequencyBinCount);
    let tick = () => {
      if (this._drawingManually) {
        window.requestAnimationFrame(tick);
        return;
      }
      this._audioAnalyser.getByteFrequencyData(audioBufferData);
      this._canvasContext.clearRect(
        0,
        0,
        this._canvasContext.canvas.width,
        this._canvasContext.canvas.height
      );
      this._activeAnimations.forEach((animation) => {
        animation.draw(
          this._isPaused ? this._snapshot : audioBufferData,
          this._canvasContext
        );
      });
      window.requestAnimationFrame(tick);
    };
    tick();
  }

  public drawManually(bufferData: Uint8Array): void {
    this._drawingManually = true;
    this._canvasContext.clearRect(
      0,
      0,
      this._canvasContext.canvas.width,
      this._canvasContext.canvas.height
    );
    this._activeAnimations.forEach((animation) => {
      animation.draw(bufferData, this._canvasContext);
    });
  }

  public clear(): void {
    this._canvasContext.clearRect(
      0,
      0,
      this._canvasContext.canvas.width,
      this._canvasContext.canvas.height
    );
    this._drawingManually = true;
  }

  public addAnimation(animation: IAnimation): void {
    this._activeAnimations.push(animation);
  }

  public clearAnimations(): void {
    this._activeAnimations = [];
  }

  public pause(): void {
    this._isPaused = true;
    this._audioAnalyser.getByteFrequencyData(this._snapshot);
  }

  public resumeRealtimeDraw(): void {
    this._drawingManually = false;
  }

  public play(): void {
    this._isPaused = false;
  }
}
