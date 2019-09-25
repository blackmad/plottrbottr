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

    <button @click.prevent="loadButterfly">
       Load a butterfly! (demo)
   </button>

    <div id="origSVG"></div>
    <div id="newSVG"></div>
    <canvas id="myCanvas" resize></canvas>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import VueUploadComponent from "vue-upload-component";
import { LaceMaker } from "../../../lace-maker2-lib.mjs";
import * as butterfly from "../../../examples/input/butterfly.svg';
import "paper";
Vue.component("file-upload", VueUploadComponent);

@Component
export default class HelloWorld extends Vue {
  files: string[] = [];

  loadButterfly() {
    console.log(butterfly);
  }

  fileUploaded(data: any[]) {
    const reader = new FileReader();
    reader.onload = async function(svgDataReader) {
      const svgData = atob(
        (svgDataReader.target.result as string).substring(26)
      );
      document.getElementById("origSVG").innerHTML = svgData;

      // waitForPaper();

      const laceMaker = new LaceMaker({
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

      // Get a reference to the canvas object
      var canvas: HTMLCanvasElement = document.getElementById(
        "myCanvas"
      ) as HTMLCanvasElement;
      // // Create an empty project and a view for the canvas:
      paper.setup(canvas);


      console.error(paper);

      await laceMaker.loadAndProcessSvgData({ svgData, paperModule: paper });

      document.getElementById("newSVG").innerHTML = laceMaker.exportSVGString();

      paper.view.draw();
    };
    reader.readAsDataURL(data[0].file);
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
</style>
