<template>
  <div>
    <file-upload
      class="btn btn-primary"
      ref="upload"
      v-model="files"
      extensions="svg"
      accept="image/svg+xml"
      :multiple="false"
      @input="fileUploaded"
    >
      <button
        type="button"
        class="btn btn-success"
        v-if="!$refs.upload || !$refs.upload.active"
        @click.prevent="$refs.upload.active = true"
      >Upload SVG</button>
    </file-upload>

    <button @click.prevent="loadButterfly">Load a butterfly! (demo)</button>

    <div id="origSVG"></div>
    <div id="newSVG"></div>
    <canvas id="myCanvas"></canvas>

    <button class="btn" @click.prevent="downloadSVG" v-if="laceMaker">Download SVG</button>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import VueUploadComponent from "vue-upload-component";
import { LaceMaker } from "../../../lace-maker2-lib.mjs";
import { fixSVG } from "../../../utils.mjs";
import * as butterflyPath from "../../../examples/input/butterfly.svg";
import "paper";
Vue.component("file-upload", VueUploadComponent);

@Component
export default class HelloWorld extends Vue {
  files: string[] = [];
  laceMaker = null;
  filePrefix = '';

  mounted() {
    // Get a reference to the canvas object
    var canvas: HTMLCanvasElement = document.getElementById(
      "myCanvas"
    ) as HTMLCanvasElement;
    // // Create an empty project and a view for the canvas:
    paper.setup(canvas);
  }

  async loadButterfly() {
    fetch(butterflyPath).then(async res => {
      const blob = await res.blob();
      this.filePrefix = 'butterfly';
      const text = await blob.text();
      this.processSVGData(text);
    });
  }

  fileUploaded(data: any[]) {
    const reader = new FileReader();
    const self = this;
    reader.onload = async function(svgDataReader) {
      const svgData = atob(
        (svgDataReader.target.result as string).substring(26)
      );
      // document.getElementById("origSVG").innerHTML = svgData;

      await self.processSVGData(svgData);
    };
    this.filePrefix = data[0].file.name.split('.')[0];
    reader.readAsDataURL(data[0].file);
  }

  async processSVGData(svgData) {
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
    paper.project.clear();

    console.error(paper);

    this.laceMaker.loadAndProcessSvgData({ svgData, paperModule: paper });

    // document.getElementById("newSVG").innerHTML = laceMaker.exportSVGString();
    paper.project.activeLayer.style.fillColor = null;
    paper.project.activeLayer.style.strokeWidth = 0.5;
    paper.project.activeLayer.fitBounds(paper.view.bounds);

    paper.view.draw();
  }

  downloadSVG() {
    const newSvgString = this.laceMaker.exportSVGString();
    const svgData = fixSVG(newSvgString);

    var encoded = encodeURIComponent(svgData);
    var uriPrefix = "data:" + "image/svg+xml" + ",";
    var dataUri = uriPrefix + encoded;

    var downloadLink = document.createElement("a");
    downloadLink.href = dataUri;

    const filename = this.filePrefix + new Date().getTime() + '.svg';

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
h3 {
  margin: 40px 0 0;
}
ul {
  list-style-type: none;
  padding: 0;
}
li {
  display: inline-block;
  margin: 0 10px;
}
a {
  color: #42b983;
}

canvas {
  width: 70vw;
  max-height: 70vh;
}

</style>
