
function setLocalwikiAddress(lat, lon){
	let request = new XMLHttpRequest();
	request.open('GET', 'https://nominatim.openstreetmap.org/reverse?format=json&lat=' + lat + '&lon=' + lon + '&zoom=10&addressdetails=1', true);
	request.responseType = 'json';
	request.onload = function () {
		let data = this.response;
		document.getElementById('Localwiki').setAttribute('href','https://localwiki.org/_search/?q=' + data.display_name);
	};
	request.send();
}

//https://qiita.com/n0bisuke/items/f2dd06bfb0e4daa1e0d8
function sortByKey(data,key,order){
	//デフォは降順(DESC)
	var num_a = -1;
	var num_b = 1;

	if(order === 'asc'){//指定があれば昇順(ASC)
	  num_a = 1;
	  num_b = -1;
	}

	data = data.sort(function(a, b){
	  var x = a[key].toUpperCase();
	  var y = b[key].toUpperCase();
	  if (x > y) return num_a;
	  if (x < y) return num_b;
	  return 0;
	});

	return data;

}

//https://stackoverflow.com/questions/14446511/most-efficient-method-to-groupby-on-an-array-of-objects
function groupBy(xs, key) {
  return xs.reduce(function(rv, x) {
    (rv[x[key]] = rv[x[key]] || []).push(x);
    return rv;
  }, {});
};


//https://github.com/googollee/eviltransform
const eviltransform = {
	
	earthR: 6378137.0,

	outOfChina(lat, lng) {
		if ((lng < 72.004) || (lng > 137.8347)) {
			return true;
		}
		if ((lat < 0.8293) || (lat > 55.8271)) {
			return true;
		}
		return false;
	},

	transform(x, y) {
		var xy = x * y;
		var absX = Math.sqrt(Math.abs(x));
		var xPi = x * Math.PI;
		var yPi = y * Math.PI;
		var d = 20.0*Math.sin(6.0*xPi) + 20.0*Math.sin(2.0*xPi);

		var lat = d;
		var lng = d;

		lat += 20.0*Math.sin(yPi) + 40.0*Math.sin(yPi/3.0);
		lng += 20.0*Math.sin(xPi) + 40.0*Math.sin(xPi/3.0);

		lat += 160.0*Math.sin(yPi/12.0) + 320*Math.sin(yPi/30.0);
		lng += 150.0*Math.sin(xPi/12.0) + 300.0*Math.sin(xPi/30.0);

		lat *= 2.0 / 3.0;
		lng *= 2.0 / 3.0;

		lat += -100.0 + 2.0*x + 3.0*y + 0.2*y*y + 0.1*xy + 0.2*absX;
		lng += 300.0 + x + 2.0*y + 0.1*x*x + 0.1*xy + 0.1*absX;

		return {lat: lat, lng: lng}
	},

	delta(lat, lng) {
		var ee = 0.00669342162296594323;
		var d = this.transform(lng-105.0, lat-35.0);
		var radLat = lat / 180.0 * Math.PI;
		var magic = Math.sin(radLat);
		magic = 1 - ee*magic*magic;
		var sqrtMagic = Math.sqrt(magic);
		d.lat = (d.lat * 180.0) / ((this.earthR * (1 - ee)) / (magic * sqrtMagic) * Math.PI);
		d.lng = (d.lng * 180.0) / (this.earthR / sqrtMagic * Math.cos(radLat) * Math.PI);
		return d;
	},

	wgs2gcj(wgsLat, wgsLng) {
		if (this.outOfChina(wgsLat, wgsLng)) {
			return {lat: wgsLat, lng: wgsLng};
		}
		var d = this.delta(wgsLat, wgsLng);
		return {lat: wgsLat + d.lat, lng: wgsLng + d.lng};
	},

	gcj2wgs(gcjLat, gcjLng) {
		if (this.outOfChina(gcjLat, gcjLng)) {
			return {lat: gcjLat, lng: gcjLng};
		}
		var d = this.delta(gcjLat, gcjLng);
		return {lat: gcjLat - d.lat, lng: gcjLng - d.lng};
	},
			
	gcj2bd(gcjLat, gcjLng) {
		if (this.outOfChina(gcjLat, gcjLng)) {
			return {lat: gcjLat, lng: gcjLng};
		}

		var x = gcjLng, y = gcjLat;
		var z = Math.sqrt(x * x + y * y) + 0.00002 * Math.sin(y * Math.PI);
		var theta = Math.atan2(y, x) + 0.000003 * Math.cos(x * Math.PI);
		var bdLng = z * Math.cos(theta) + 0.0065;
		var bdLat = z * Math.sin(theta) + 0.006;
		return {lat: bdLat, lng: bdLng};
	},


	bd2gcj(bdLat, bdLng) {
		if (this.outOfChina(bdLat, bdLng)) {
			return {lat: bdLat, lng: bdLng};
		}

		var x = bdLng - 0.0065, y = bdLat - 0.006;
		var z = Math.sqrt(x * x + y * y) - 0.00002 * Math.sin(y * Math.PI);
		var theta = Math.atan2(y, x) - 0.000003 * Math.cos(x * Math.PI);
		var gcjLng = z * Math.cos(theta);
		var gcjLat = z * Math.sin(theta);
		return {lat: gcjLat, lng: gcjLng};
	},


	wgs2bd(wgsLat, wgsLng) {
		var gcj = this.wgs2gcj(wgsLat, wgsLng);
		return this.gcj2bd(gcj.lat, gcj.lng);
	},


	bd2wgs(bdLat, bdLng) {
		var gcj = this.bd2gcj(bdLat, bdLng);
		return this.gcj2wgs(gcj.lat, gcj.lng);
	},
}

function setLatLon(lat_, lon_){
	document.getElementById("lat").innerHTML = lat_;
	document.getElementById("lon").innerHTML = lon_;
	lat = lat_;
	lon = lon_;

}
function setAddress(lat, lon){
		var request = new XMLHttpRequest();
		request.open('GET', 'https://nominatim.openstreetmap.org/reverse?format=json&lat=' + lat + '&lon=' + lon + '&zoom=10&addressdetails=1', true);
		request.responseType = 'json';
		request.onload = function () {
			var data = this.response;
			console.log(data);
			document.getElementById("address").innerHTML = data.display_name;
			country_code = data.address.country_code;
			if (country_code == 'cn'){
				if (is_gcj_in_china){
					console.log('in china from google/bing/baidu');
					const wgs = eviltransform.gcj2wgs(parseFloat(lat),parseFloat(lon));
					setLatLon(wgs.lat, wgs.lng);
					setMaps(wgs.lat, wgs.lng, zoom, maps);
				} else {
					//中国国内が確定したので作り直し
					setMaps(lat, lon, zoom, maps);
				}
			}

		};
		request.send();
	}



		
function getLatLonZoom(url, maps) {
	for (let map of maps){
		if (map.hasOwnProperty('getLatLonZoom')){
			let latlonzoom = map.getLatLonZoom(url);
			if (latlonzoom) {
				if (map.hasOwnProperty('is_gcj_in_china')){
					is_gcj_in_china = map.is_gcj_in_china;
					console.log('google/bing/baidu');
				}
				return latlonzoom;
			}
		}
	}
	return ;
}
function img_src_replace(domain) {
    let img = new Image();
	const src = `favicons/${domain}.png`;
	img.src = src;
	const domain_class = domain.replace( /\./g , "" );
 
    // 画像があった時の処理
    img.onload = function() {
		//$(`.${domain_class}`).attr('src', src);
		//console.log('onload:', img.src);
    }
 
    // 画像がなかった時の処理
    img.onerror = function() {
        $(`.${domain_class}`).attr('src', 'http://www.google.com/s2/favicons?domain=' + domain);
		//console.log('onerror:', img.src);
    }
	
}
function setMaps(lat, lon, zoom, maps){

	let columns = groupBy(maps, 'category');
	
	//名前順に並び替え
	for (let key in columns){
		columns[key] = sortByKey(columns[key], 'name', 'asc');
	}

	
  let maplist = "";
  
  let categories = Object.keys(columns);

  const checkbox_show_descriptions = document.getElementById('checkbox_show_descriptions').checked;

  for (let category of categories){
		if (checkbox_show_descriptions){
			maplist += `
				<div class="submaps" id="${category}" style="float:left; margin: 3px;">
				<table class="table table-sm caption-top">
					<caption class="title">${category}</caption>
					<thead>
					</thead>
					<tbody>
			`;
		} else {
			maplist += '<ul class="submaps" id="' + category + '"><li class="title">' + category + '</li>';
		}
	  
	  let mapsublist = columns[category];
  //alert(category);	  
	    for (let map of mapsublist){
			if (map.hasOwnProperty('getUrl')) {
				let tooltip = "";
				let map_lat = lat, map_lon = lon;
				if (map.hasOwnProperty('is_gcj_in_china') && map.is_gcj_in_china && country_code == 'cn'){
					console.log('setting google/bing/baidu coords')
					const gcj = eviltransform.wgs2gcj(parseFloat(lat), parseFloat(lon));
					map_lat = gcj.lat;
					map_lon = gcj.lng;
					if (map.is_gcj_in_china == 'bd'){
						const bd = eviltransform.gcj2bd(map_lat, map_lon);
						map_lat = bd.lat;
						map_lon = bd.lng;
					}
				}

				//地図の説明をツールチップとして作成
				if (map.hasOwnProperty('description')) tooltip = ' title="' + map.description + '" ';

				//一方通行のマップに、*マークを付ける
				const oneway_note = map.hasOwnProperty('getLatLonZoom') ? '' : '<sup><span title="Jump-to only">*</span></sup>';

				//地図リストを追加
				
				if (checkbox_show_descriptions){
					maplist += `
						<tr>
							<td><img class="${map.domain.replace( /\./g , "" )}" src="favicons/${map.domain}.png" width="16" height="16"><a href="${map.getUrl(map_lat,map_lon,zoom)}" id="${map.name}">${map.name}${oneway_note}</a></td>
							<td><small>${map.hasOwnProperty('description') ? map.description : ''}</small></td>
						</tr>
					`;
				} else {
					maplist += `<li><img class="${map.domain.replace( /\./g , "" )}" src="favicons/${map.domain}.png" width="16" height="16"><a href="${map.getUrl(map_lat,map_lon,zoom)}" id="${map.name}" ${tooltip}>${map.name}${oneway_note}</a></li>`;
				}




				//指定した画像が無かったらgoogle機能で置き換える
				img_src_replace(map.domain);
				//maplist += '<li>' + '<img src="http://www.google.com/s2/favicons?domain=' + map.domain + '">' + '<a href="' + map.getUrl(lat,lon,zoom) + '" id="' + map.name + '"'+ tooltip + '>' + map.name + '</a></li>';
			}
		}
		if (checkbox_show_descriptions){
			maplist += `
					</tbody>
					</table>
					</div>
			`;
		} else {
			maplist += '</ul>';
		}
		
  }
  

  /*
  for (let column of columns)
  
  let maplist = "";
  for (let map of maps){
	maplist = maplist + '<li>' + '<img src="http://www.google.com/s2/favicons?domain=' + map.domain + '">' + '<a href="' + map.getUrl(lat,lon,zoom) + '">' + map.name + '</li>';
  };
  */
  document.getElementById("maps").innerHTML =  maplist;
}

function button_refresh_links(){
	const url = document.getElementById('inputbox_map_url').value;
	console.log(url);
	make_links(url);
}

//移動前の地図URLを受取って、リンクを生成する
function make_links(prevUrl){
	let elementUrl = document.getElementById("showurl");


	document.getElementById("description").style.display = "none";
	elementUrl.innerHTML = prevUrl;
	let latlonzoom;
	latlonzoom = getLatLonZoom(prevUrl, maps);
	if (latlonzoom){
		[lat, lon, zoom] = latlonzoom;
		document.getElementById("sorry").innerHTML = '';
	}
	else {
		document.getElementById("sorry").innerHTML = "<strong>Sorry, this URL is not supported.</strong>";
	}

	setAddress(lat,lon);	
	setLatLon(lat,lon);

	document.getElementById("zoom").innerHTML = zoom;


	setMaps(lat, lon, zoom, maps);
}

function init(){




/* 
const testurl = "https://www.openstreetmap.org/#map=13/33.0354/129.7383&layers=N";
let latlonzoom = getLatLonZoom(testurl, maps);
*/


	const prevUrls = location.href.match(/#(.*)$/);
	if (prevUrls) {
		const prevUrl = prevUrls[1];
		make_links(prevUrl);
	}
	else {
		document.getElementById("sorry").innerHTML = "<strong>Install above bookmarklet first.</strong>";
		//set dummy links
		setMaps(lat, lon, zoom, maps);
	}
}
document.getElementById('checkbox_show_descriptions').addEventListener('change', function(){
	console.log('checkbox_show_descriptions');
	setMaps(lat, lon, zoom, maps);
});
document.getElementById('checkbox_set_onoff').addEventListener('change', function(){
	console.log('checkbox_set_onoff');
});


//Global variables
let lat = 51.5129, lon = 0, zoom = 13;
let country_code;
let is_gcj_in_china = false;

init();



  

  