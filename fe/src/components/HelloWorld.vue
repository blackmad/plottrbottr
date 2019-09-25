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
      >Upload SVGxxx</button>
    </file-upload>

    <div id="origSVG"></div>
    <div id="newSVG"></div>
    	<canvas id="myCanvas" resize></canvas>
  </div>

</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import VueUploadComponent from "vue-upload-component";
import {LaceMaker} from '../../../lace-maker2-lib.js';
import 'paper';
Vue.component("file-upload", VueUploadComponent);

@Component
export default class HelloWorld extends Vue {
  @Prop() private msg!: string;
  files: string[] = [];

  fileUploaded(data: any[]) {
    console.log(data[0]);
    console.log(data[0].active);
    console.log("file uploaded", data[0].data);
    console.log("file uploaded", data[0].file);
    console.log("file uploaded", data[0].response);

    const reader = new FileReader();
    reader.onload = function(svgDataReader) {
      console.log("svg", svgDataReader);
      const svgData = atob((svgDataReader.target.result as string).substring(26));
      document.getElementById('origSVG').innerHTML = svgData;

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
  		var canvas: HTMLCanvasElement = document.getElementById('myCanvas') as HTMLCanvasElement;
  		// Create an empty project and a view for the canvas:
      paper.setup(canvas);
      
      laceMaker.loadAndProcessSvgData({ svgData });
  		
  		//paper.view.draw();
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
