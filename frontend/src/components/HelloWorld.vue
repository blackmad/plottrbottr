<template>
  <v-container>
    <div class="dat" id="dat">
      <dat-gui
        v-if="laceMaker"
        closeText="Close controls"
        openText="Open controls"
        closePosition="bottom"
      >
        <!-- <dat-color v-model="background" label="Background"/> -->
        <dat-boolean v-model="args.voronoi" label="Voronoi" />
        <dat-boolean v-model="args.rounded" label="Rounded shapes" />

        <dat-number v-model="args.outlineSize" label="Outline Size (in)" />
        <dat-number v-model="args.safeBorder" label="Safe Border (in)" />

        <dat-boolean v-model="args.subtract" label="Subtract Mode" />
        <dat-number v-model="args.subtractBuffer" label="Subtract Buffer" v-if="args.subtract" />

        <dat-number v-model="args.numPoints" label="Outline Approx Points" />
        <dat-number v-model="args.numExtraPoints" label="Extra Points" />

        <dat-folder label="Sizing">
          <dat-number v-model="args.maxWidth" label="Max Width (in)" />
          <dat-number v-model="args.maxHeight" label="Max Height (in)" />
        </dat-folder>

        <dat-number v-model="args.randomSeed" label="Seed" />

        <!-- <dat-button @click="rerender" label="Rerender" /> -->
      </dat-gui>
    </div>
    <v-row>
      <v-col cols="1"></v-col>
      <v-col sm="11" md="7">
        <v-row class="pb-4">
          <file-upload
            ref="upload"
            v-model="files"
            extensions="svg"
            accept="image/svg+xml"
            :multiple="false"
            @input="fileUploaded"
          >
            <v-btn
              v-if="!$refs.upload || !$refs.upload.active"
              @click.prevent="$refs.upload.active = true"
            >Upload SVG</v-btn>
          </file-upload>
          <!-- <v-btn @click.prevent="loadButterfly">Load a butterfly! (demo)</v-btn> -->
        </v-row>
        <v-row>
          <canvas id="myCanvas" resize></canvas>
          <div style="width:245px">&nbsp;</div>
        </v-row>
        <v-row class="pt-6">
          <v-btn @click.prevent="downloadSVG" v-if="laceMaker">Download Lace-y SVG</v-btn>
        </v-row>
      </v-col>
    </v-row>
  </v-container>
</template>

<script lang="ts">
import { Component, Prop, Vue, Watch } from "vue-property-decorator";

import VueUploadComponent from "vue-upload-component";
Vue.component("file-upload", VueUploadComponent);

import DatGui from "@cyrilf/vue-dat-gui";

Vue.use(DatGui);

import "paper";

// @ts-ignore
import { LaceMaker } from "../../../lace-maker2-lib.mjs";
// @ts-ignore
import { fixSVG } from "../../../utils.mjs";
// @ts-ignore
import * as butterflyPath from "../../../examples/input/butterfly.svg";

@Component
export default class HelloWorld extends Vue {
  files: string[] = [];
  laceMaker = null;
  filePrefix = "";

  lastSVGData = "";

  args = {
    numExtraPoints: 10,
    numPoints: 50,
    maxWidth: 3,
    maxHeight: 3,

    voronoi: true,
    subtract: false,
    rounded: false,

    subtractBuffer: 0.2,
    outlineSize: 0.03,
    safeBorder: 0.1,
    randomSeed: new Date().getTime()
  };

  // numExtraPoints: number = 10;
  // numPoints: number = 50;
  // maxWidth: number = 3;
  // maxHeight: number = 3;

  // voronoi: boolean = true;
  // subtract: boolean = false;
  // rounded: boolean = false;

  // subtractBuffer = 0.2;
  // outlineSize = 0.03;
  // safeBorder = 0.1;

  @Watch("args", { deep: true })
  watcher() {
    this.rerender();
  }

  mounted() {
    // Get a reference to the canvas object
    var canvas: HTMLCanvasElement = document.getElementById(
      "myCanvas"
    ) as HTMLCanvasElement;
    // // Create an empty project and a view for the canvas:
    // @ts-ignore
    paper.setup(canvas);

    // @ts-ignore
    Math.seedrandom(this.args.randomSeed);

    this.loadButterfly();

    this.loadHash();
    this.updateHash();
  }
  async loadButterfly() {
    fetch(butterflyPath).then(async res => {
      const blob = await res.blob();
      this.filePrefix = "butterfly";
      // @ts-ignore
      const text = await blob.text();
      this.processSVGData(text);
    });
  }
  fileUploaded(data: any[]) {
    const reader = new FileReader();
    const self = this;
    reader.onload = async function(svgDataReader) {
      const svgData = atob(
        // @ts-ignore
        (svgDataReader.target.result as string).substring(26)
      );
      // document.getElementById("origSVG").innerHTML = svgData;
      await self.processSVGData(svgData);
    };
    this.filePrefix = data[0].file.name.split(".")[0];
    reader.readAsDataURL(data[0].file);
  }

  updateHash() {
     window.location.hash = JSON.stringify(this.args);
  }

  loadHash() {
    if (window.location.hash.length > 1) {
      this.args = JSON.parse(decodeURI(
        window.location.hash.substring(1)))
    }
  }

  rerender() {
    this.updateHash();
    this.processSVGData(this.lastSVGData);
  }

  async processSVGData(svgData: string) {
    this.lastSVGData = svgData;

    this.laceMaker = new LaceMaker({
      debug: false,
      inchInPoints: 72,
      maxWidth: this.args.maxWidth,
      maxHeight: this.args.maxHeight,
      voronoi: this.args.voronoi,
      subtract: this.args.subtract,
      numPoints: this.args.numPoints,
      numExtraPoints: this.args.numExtraPoints,
      subtractBuffer: this.args.subtractBuffer,
      outlineSize: this.args.outlineSize,
      safeBorder: this.args.safeBorder,
      rounded: this.args.rounded,
      holeSize: 0,
      addHole: false,
      butt: false
    });

    // @ts-ignore
    paper.project.clear();
    // @ts-ignore
    this.laceMaker.loadAndProcessSvgData({ svgData, paperModule: paper });
    // @ts-ignore
    paper.project.activeLayer.style.fillColor = null;
    // @ts-ignore
    paper.project.activeLayer.style.strokeWidth = 0.5;
    // @ts-ignore
    paper.project.activeLayer.fitBounds(paper.view.bounds);
  }

  downloadSVG() {
    // @ts-ignore
    const newSvgString = this.laceMaker.exportSVGString();
    const svgData = fixSVG(newSvgString);
    var encoded = encodeURIComponent(svgData);
    var uriPrefix = "data:" + "image/svg+xml" + ",";
    var dataUri = uriPrefix + encoded;
    var downloadLink = document.createElement("a");
    downloadLink.href = dataUri;
    const filename = this.filePrefix + this.args.randomSeed + ".svg";
    downloadLink.download = filename;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    return false;
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
canvas {
  max-width: calc(100% - 245px);
  max-height: 70vh;
}

.file-uploads {
  overflow: visible !important;
}

.vue-dat-gui {
  z-index: 100000;
  margin-top: 75px;
}
</style>