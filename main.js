
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
const cacheDb = {
	prefix: "OpenSwitchMaps:cache",
	expire: 2 * 24 * 60 * 60 * 1000, // 2 day
	callback: {},
	get(key) {
		this.clearTimeout();
		const json = localStorage.getItem(`${this.prefix}:${key}`);
		if (json) return JSON.parse(json).data;
	},
	ajaxCallback(url, callback) {
		const key = `ajax:${url}`;
		const data = this.get(key);
		if (data) {
			callback(data);
			return "cache";
		}
		let callbackList = this.callback[key];
		if (callbackList) {
			callbackList.push(callback);
			return "loading";
		}
		
		callbackList = this.callback[key] = [callback];
		var that = this;
		const request = new XMLHttpRequest();
		request.open("GET", url, true);
		request.onload = function () {
			var data = this.response;
			that.set(key, data);
			for (const callback of callbackList) callback(data);
			that.callback[key] = null;
		};
		request.send();
		return "send";
	},
	set(key, data) {
		const record = {time: Date.now(), data: data};
		const json = JSON.stringify(record);
		localStorage.setItem(`${this.prefix}:${key}`, json);
	},
	clearTimeout(time = Date.now() - this.expire) {
		const prefix = this.prefix + ':';
		for (const key of Object.keys(localStorage)) {
			if (key.slice(0, prefix.length) != prefix) continue;
			const json = localStorage.getItem(key);
			const record = JSON.parse(json);
			if (record.time < time) localStorage.removeItem(key);
		}
	}
}

function setLatLon(lat_, lon_){
	document.getElementById("lat").innerHTML = lat_;
	document.getElementById("lon").innerHTML = lon_;
	lat = lat_;
	lon = lon_;
}
function setAddress(lat, lon) {
	if (!lat || !lon) return;//変な値だったらヤメ
	const url = "https://nominatim.openstreetmap.org/reverse?format=json&lat=" + lat + "&lon=" + lon + "&zoom=10&addressdetails=1";
	return cacheDb.ajaxCallback(url, function (json) {
		const data = JSON.parse(json);
		console.log(data);
		document.getElementById("address").innerHTML = data.display_name;
		country_code = data.address.country_code;
		if (country_code == "cn") {
			if (is_gcj_in_china) {
				console.log("in china from google/bing/baidu");
				const wgs = eviltransform.gcj2wgs(parseFloat(lat), parseFloat(lon));
				setLatLon(wgs.lat, wgs.lng);
				update_map_links([wgs.lat, wgs.lng, zoom, extra]);
			} else {
				//中国国内が確定したので作り直し
				update_map_links([lat, lon, zoom, extra]);
			}
		}
	});
}



		
function getLatLonZoom(url, maps) {
	if (!url) return;
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
function get_url(map, lat, lon, zoom, extra){

	//console.log(map.name, lat, lon, zoom, extra);
	if (extra && extra.changeset) {
		
		if (!map.hasOwnProperty('getChangesetUrl')) return false;
		return map.getChangesetUrl(extra.changeset);
	}
	if (!map.hasOwnProperty('getUrl')) return false;
	if (lat) {
		return map.getUrl(lat, lon, zoom, extra);
	}

	return false;
}
function update_map_links(latlonzoom){
	if (!latlonzoom){
		document.getElementById("sorry").innerHTML = "<strong>Sorry, this URL is not supported.</strong>";
		[lat, lon, zoom] = [51.5129, 0.1, 13];
		extra = {};
	} else {
		document.getElementById("sorry").innerHTML = "";
		[lat, lon, zoom, extra] = latlonzoom;
		lon = normalizeLon(lon);
		zoom = normalizeZoom(zoom);
	}
	
	for (const map of maps){
		const elem_a = document.getElementById(`a_${map.name}`);
		if (!elem_a) continue;
		//if (!map.hasOwnProperty('getUrl')) continue;
		const url = get_url(map, lat, lon, zoom, extra);
		if (url){
			elem_a.setAttribute('href',url);
			set_error_element_by_id(`item_${map.name}`, false);
		} else {
			elem_a.removeAttribute('href');
			set_error_element_by_id(`item_${map.name}`, true);
		}
	}
}

function setMaps(lat, lon, zoom, maps, extra){

	let columns = groupBy(maps, 'category');
	
	//名前順に並び替え
	for (let key in columns){
		columns[key] = sortByKey(columns[key], 'name', 'asc');
	}

	
  let maplist = "";
  
  let categories = Object.keys(columns);


  for (let category of categories){
		maplist += `
			<div class="submaps" id="${category}" style="float:left; margin: 3px;">
			<table class="table table-sm caption-top">
				<caption class="title">${category}</caption>
				<thead>
				</thead>
				<tbody>
		`;
	  
	  let mapsublist = columns[category];
  //alert(category);	  
	    for (let map of mapsublist){
			if (map.hasOwnProperty('getUrl')) {
				let tooltip = "";
				let map_lat = lat, map_lon = lon;

				//地図の説明をツールチップとして作成
				if (map.hasOwnProperty('description')){
					tooltip = ' title="' + map.description + '" ';
				}
				//一方通行のマップに、*マークを付ける
				const oneway_note = map.hasOwnProperty('getLatLonZoom') ? '' : '<sup><span title="Jump-to only">*</span></sup>';

				//地図リストを追加
				
				maplist += `
					<tr id="item_${map.name}">
						<td>
							<input type="checkbox" id="checkbox_show_${map.name}" onchange="save_settings();">
							<img class="${map.domain.replace( /\./g , "" )}" src="favicons/${map.domain}.png" width="16" height="16" id="icon_${map.name}">
							<a href="${get_url(map, map_lat,map_lon, zoom, extra)}" id="a_${map.name}">
								<span id="label_${map.name}">${map.name}</span>${oneway_note}
							</a>
						</td>
						<td class="td_description" id="description_${map.name}">
							<small>${map.hasOwnProperty('description') ? map.description : ''}</small>
						</td>
					</tr>
				`;

				//指定した画像が無かったらgoogle機能で置き換える
				img_src_replace(map.domain);
				//maplist += '<li>' + '<img src="http://www.google.com/s2/favicons?domain=' + map.domain + '">' + '<a href="' + map.getUrl(lat,lon,zoom) + '" id="' + map.name + '"'+ tooltip + '>' + map.name + '</a></li>';
			}
		}
		maplist += `
				</tbody>
				</table>
				</div>
		`;
		
  }
  
  document.getElementById("maps").innerHTML =  maplist;
}

function input_key_press(event) {
	if (event.key == 'Enter') button_refresh_links()
}

function button_refresh_links(){
	const url = document.getElementById('inputbox_map_url').value;
	update_from_url(url);
	history.pushState({url: url},'','#' + url);
}

function update_from_url(url){
	const latlonzoom = getLatLonZoom(url, maps);
	//if (!latlonzoom) return;
	console.log(latlonzoom);
	update_map_links(latlonzoom); 
	/*if (latlonzoom.length > 1)*/ setAddress(latlonzoom[0], latlonzoom[1]);
}

window.addEventListener('popstate', function (event) {
	const state = event.state;
	const url = state.url;
	update_from_url(url);
	document.getElementById('inputbox_map_url').value = url;
})

function hide_instructions(){
	document.getElementById("description").style.display = "none";
}
//移動前の地図URLを受取って、リンクを生成する
/*
function make_links(prevUrl){
	let elementUrl = document.getElementById("showurl");


	document.getElementById("description").style.display = "none";
	elementUrl.innerHTML = prevUrl;
	let latlonzoom;
	latlonzoom = getLatLonZoom(prevUrl, maps);
	if (latlonzoom){
		[lat, lon, zoom, pin_lat, pin_lon] = latlonzoom;
		document.getElementById("sorry").innerHTML = '';
	}
	else {
		document.getElementById("sorry").innerHTML = "<strong>Sorry, this URL is not supported.</strong>";
	}

	setAddress(lat,lon);	
	setLatLon(lat,lon);

	document.getElementById("zoom").innerHTML = zoom;


	setMaps(lat, lon, zoom, maps, pin_lat, pin_lon);
}
*/
function get_prev_url(){
	const prevUrls = location.href.match(/#(.*)$/);
	if (prevUrls) {
		const prevUrl = prevUrls[1];
		return prevUrl;
	}
	else {
		document.getElementById("sorry").innerHTML = "<strong>Install above bookmarklet first.</strong>";
	}
	return false;
}

function commonGetUrl(lat, lon, zoom, extra) {
	let url = this.map_format;
	url = url.replace('{zoom}', zoom).replace('{latitude}', lat).replace('{longitude}', lon);
	return url;
}
let custom_maps =[
	/*
	{
		name: "Custom map 1", //shoud be unique, used as id
		category: "Custom maps",
		domain: "",
		label: "Map Name 1",
		getUrl: commonGetUrl,
		map_format:'https://#{zoom}/{latitude}/{longitude}',
	},
	{
		name: "Custom map 2",
		category: "Custom maps",
		domain: "",
		label: "Map Name 2",
		getUrl: commonGetUrl,
		map_format:'https://#{zoom}/{latitude}/{longitude}',
	},
	*/
];
for (let i=1; i<=10; i++){
	custom_maps.push({
		name: `Custom${('00'+i).slice(-2)}`,
		category: "Custom maps",
		domain: "",
		label: `Map Name ${('00'+i).slice(-2)}`,
		getUrl: commonGetUrl,
		map_format:'https://#{zoom}/{latitude}/{longitude}',
	});
}

function custom_maps_set_domains(){
	for (const map of custom_maps){
		custom_maps_set_domain(map);
	}
}
function custom_maps_set_domain(map){
	const match = map.map_format.match(/([^./]*\.[^./]*)\//);//extract domain from map_format url
	if (match) {
		map.domain = match[1];
	}
}
function custom_maps_init(){
	custom_maps_load();
	custom_maps_set_domains();
	maps = maps.concat(custom_maps);
	//console.log(custom_maps);
}
function custom_maps_load(){
	const loaded_maps = JSON.parse(localStorage.getItem('OpenSwitchMapsCustomMaps'));
	if (loaded_maps) {
		/*
		for (const map of loaded_maps){
			const name = map.name;
			const custom_map = custom_maps.find(element => element.name === name);
			if (custom_map){
				for (const key in map){
					custom_map[key] = map[key];
				}
			}
		}
		*/
		//保存したカスタム地図の数と初期設定したカスタム地図の数が違うこともあるので。
		for (let i=0;i<loaded_maps.length;i++){
			custom_maps[i] = loaded_maps[i];
		}
		
		//stringifyだと関数は保存されないようなので、別途くっつける。
		for (const map of custom_maps){
			map.getUrl = commonGetUrl;
		}
	}
}
function custom_maps_save(){
	localStorage.setItem('OpenSwitchMapsCustomMaps', JSON.stringify(custom_maps));
}
//
function custom_maps_setup(){
	for (const custom_map of custom_maps){
		//set label
		const elem_label = document.getElementById(`label_${custom_map.name}`);
		elem_label.innerHTML = custom_map.label;

		//temporal UI
		//put input boxes in description cell
		const description_cell = document.getElementById(`description_${custom_map.name}`);
		if (!description_cell) continue;
		description_cell.innerHTML = `
		<input type="text" name="label" id="input_label_${custom_map.name}" value="${custom_map.label}" placeholder="">
		<input type="text" name="url" id="input_url_${custom_map.name}" value="${custom_map.map_format}" placeholder="">
		<button type="button" id="input_button_${custom_map.name}" onclick="custom_maps_update('${custom_map.name}')">↺</button>
		`;


	}
}
function custom_maps_update(map_name){


	//apply label
	const elem_label = document.getElementById(`label_${map_name}`);
	const elem_input_label = document.getElementById(`input_label_${map_name}`);
	elem_label.innerText = elem_input_label.value;

	//apply url
	const elem_input_url = document.getElementById(`input_url_${map_name}`);
	const map = custom_maps.find(element => element.name === map_name);
	//console.log(map_name, elem_input_url);
	map.map_format = elem_input_url.value;
	map.label = elem_input_label.value;
	custom_maps_set_domain(map);

	//update icon
	const elem_icon = document.getElementById(`icon_${map_name}`);
	elem_icon.src = 'http://www.google.com/s2/favicons?domain=' + map.domain;
	//$(`#icon_${map_name}`).attr('src', 'http://www.google.com/s2/favicons?domain=' + map.domain);

	//refresh links
	button_refresh_links();

	custom_maps_save();

}
function init_maps(){
	custom_maps_init();
	setMaps(lat, lon, zoom, maps, extra);
	custom_maps_setup();

	//地図表示・非表示設定を読み込む
	load_display_maps_setting();

	show_hide_maps();
}
function init(){


}
function show_hide_maps(){
	change_map_display();
	change_description_display();
}
function change_description_display(){
	const checkbox_show_descriptions = document.getElementById('checkbox_show_descriptions').checked;
	//const checkbox_display = checkbox_show_descriptions ? 'table-cell' : 'none';
	const elements = document.getElementsByClassName('td_description');
	for (const element of elements){
		hide_element(element, !checkbox_show_descriptions);
	}
}
document.getElementById('checkbox_show_descriptions').addEventListener('change', function(){
	console.log('checkbox_show_descriptions');
	change_description_display();
});

function change_map_display(){

	change_checkbox_display();

	const checkbox_show_all = document.getElementById('checkbox_show_all').checked;
	const checkbox_display = checkbox_show_all ? 'inline' : 'none';


	for (const map of maps){
		const elem_item = document.getElementById(`item_${map.name}`);
		if (!elem_item) continue;

		
		//全部表示か、全部非表示かにする
		hide_element(elem_item, !checkbox_show_all);
		//全部表示ならよし
		if (checkbox_show_all) continue;
		
		//全部非表示のときは、チェックボックスがついているものは表示する
		const elem_checkbox_show_map = document.getElementById(`checkbox_show_${map.name}`);
		if (!elem_checkbox_show_map) continue;
		const checkbox_show_map = elem_checkbox_show_map.checked;
		hide_element(elem_item, !checkbox_show_map);
		
	}
}

function hide_element_by_id(element_id, hide){
	const element = document.getElementById(element_id);
	if (!element) return false;
	return hide_element(element, hide);
}

function hide_element(element, hide){
	if (!element) return false;
	if (hide){
		element.classList.add('item_hide');
	} else {
		element.classList.remove('item_hide');
	}
	return true;
}

function set_error_element_by_id(element_id, is_error){
	const element = document.getElementById(element_id);
	if (!element) return false;
	if (is_error){
		element.classList.add('item_error');
	} else {
		element.classList.remove('item_error');
	}
	return true;
}
function change_checkbox_display(){
	
	const checkbox_show_all = document.getElementById('checkbox_show_all').checked;
	//const checkbox_display = checkbox_show_all ? 'inline' : 'none';

	for (const map of maps){
		hide_element_by_id(`checkbox_show_${map.name}`, !checkbox_show_all);
	}
}
//チェックボックスで、地図を表示・非表示を設定
document.getElementById('checkbox_show_all').addEventListener('change', function(){
	//表示・非表示切り替えのタイミングで保存
	save_display_maps_setting();
	change_map_display();

});
function save_settings(){
	save_display_maps_setting();
}
//地図表示・非表示の設定を保存
function save_display_maps_setting(){
	let settings = {};
	for (const map of maps){
		const checkbox_id = document.getElementById(`checkbox_show_${map.name}`);
		if (checkbox_id){
			settings[map.name] = checkbox_id.checked;
		}
	}
	settings['checkbox_show_descriptions'] = document.getElementById('checkbox_show_descriptions').checked;
	settings['checkbox_show_all'] = document.getElementById('checkbox_show_all').checked;
	console.log(settings);
	localStorage.setItem('OpenSwitchMapsSettings', JSON.stringify(settings));
}

//地図表示・非表示の設定を読み込み
function load_display_maps_setting(){
	let settings = JSON.parse(localStorage.getItem('OpenSwitchMapsSettings'));
	console.log("load settings: ", settings);

	if (!settings) settings = {};
	for (const map of maps){
		const id = document.getElementById(`checkbox_show_${map.name}`);
		if (id){
			const setting = settings[map.name];
			if (setting === false){
				id.checked = false;
			} else if (setting === true){
				id.checked = true;
			} else {
				//保存された設定がない場合は、表示しない
				//No touch seems safer than check off 
				//id.checked = false;
			}
		}
	}

	document.getElementById('checkbox_show_descriptions').checked = ('checkbox_show_descriptions' in settings) ? settings['checkbox_show_descriptions'] : true;
	document.getElementById('checkbox_show_all').checked = ('checkbox_show_all' in settings) ? settings['checkbox_show_all'] : true;


}


function normalizeLon(lon) {
	return ((((Number(lon) + 180) % 360) + 360) % 360) - 180;
  }

function normalizeZoom(zoom){
	return Math.round(Number(zoom));
}

//Global variables
let lat = 51.5129, lon = 0.1, zoom = 13;
let extra = {
	pin_lat: null,
	pin_lon: null,
	changeset: null,
}

let country_code;
let is_gcj_in_china = false;

init();
init_maps();
const prev_url = get_prev_url();
if (prev_url) {
	hide_instructions();
	document.getElementById('inputbox_map_url').value = prev_url;
}
update_from_url(prev_url);
history.replaceState({url: prev_url}, '', '#'+prev_url);
