<template>
  <v-container>
    <v-col cols="6">
      <v-row>
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

        <v-btn @click.prevent="loadButterfly">Load a butterfly! (demo)</v-btn>
      </v-row>
      <v-row>
        <canvas id="myCanvas"></canvas>
      </v-row>
      <v-row>
        <v-btn @click.prevent="downloadSVG" v-if="laceMaker">Download SVG</v-btn>
      </v-row>
    </v-col>
  </v-container>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";

import VueUploadComponent from "vue-upload-component";
Vue.component("file-upload", VueUploadComponent);

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
  mounted() {
    // Get a reference to the canvas object
    var canvas: HTMLCanvasElement = document.getElementById(
      "myCanvas"
    ) as HTMLCanvasElement;
    // // Create an empty project and a view for the canvas:
    // @ts-ignore
    paper.setup(canvas);
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
  async processSVGData(svgData: string) {
    this.laceMaker = new LaceMaker({
      debug: false,
      inchInPoints: 72,
      maxWidth: 3,
      maxHeight: 3,
      voronoi: true,
      subtract: false,
      numPoints: 50,
      numExtraPoints: 10,
      subtractBuffer: 0.2,
      outlineSize: 0.03,
      safeBorder: 0.1,
      rounded: false,
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
    const filename = this.filePrefix + new Date().getTime() + ".svg";
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
  width: 70vw;
  max-height: 70vh;
}

.file-uploads {
  overflow: visible !important;
}
</style>