
//****(MENU)*****
var panel = ui.Panel({style: {width: '250px'}});
ui.root.add(panel);
var map = ui.Map();
map.style().set('cursor', 'crosshair');
 
var titlePanel = ui.Panel([table], 'flow', {width: '300px',padding:'8px'});
ui.root.insert(0, titlePanel);
 
// Definição de constantes
var AGUAS_DE_LINDOIA = 'ÁGUAS DE LINDÓIA';
var AMPARO = 'AMPARO';
var HOLAMBRA = 'HOLAMBRA';
var JAGUARIUNA = 'JAGUARIÚNA';
var LINDOIA = 'LINDÓIA';
var MONTE_ALEGRE_DO_SUL = 'MONTE ALEGRE DO SUL';
var PEDREIRA = 'PEDREIRA';
var SERRA_NEGRA = 'SERRA NEGRA';
var SOCORRO = 'SOCORRO';
var cidade = AMPARO;
var dateinicial = '2017-01-01';
var datefinal = '2017-12-31';
// Cria uma lista vazia de restrições
var constraints = [];
 
 
// ***CLASSIFICAÇÃO***
function classificacao(){
Map.clear();
var area_estudo = limites_ca//limites_ca serve para classificar toda a área
var area_treino = limites_ca.filter(ee.Filter.eq('NM_MUNICIP', JAGUARIUNA))
Map.centerObject(area_estudo);
 
// Classifica as imagens pelo mínimo de pixel nublado % e seleci
var s2image_treino = ee.ImageCollection('COPERNICUS/S2')
                   .filterDate('2018-01-01','2018-12-31')
                   .filterBounds(area_treino)                   
                   .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 10))
                   .sort('CLOUDY_PIXEL_PERCENTAGE')
                   .map(function(img){
                    var t = img.select(['B4','B3','B2','B1','B5','B6','B7','B8','B8A', 'B9','B10', 'B11','B12']).divide(10000);
                    var out = t.copyProperties(img).copyProperties(img,['system:time_start']);
                   return out;
                     });
// Obtém a imagem menos dublada
var s2leastCloud_treino = s2image_treino.median();
var reflec_min_treino = s2leastCloud_treino.clip(area_treino);
// Agrupamento das amostras em um único arquivo
var amostras = urbano.merge(vegetacao_natural).merge(pastagem).merge(culturas).merge(solo_exposto).merge(agua);
// Propriedade das amostras
var classe = 'cobertura';
 // Preparação para o treinamento do classificador
var treinamento = reflec_min_treino.sampleRegions({
collection: amostras,
properties: [classe],
scale: 30,
geometries: true
});
// Treinamento das amostras
var classificador = ee.Classifier.libsvm().train({
features: treinamento,
classProperty: classe,
});
print(classificador,treinamento);
 
/* ----Imagem do Ano a Classificar----*/
 
// Classifica as imagens pelo mínimo de pixel nublado% e seleciona as bandas
var s2image_class = ee.ImageCollection('COPERNICUS/S2')
                   .filterDate(dateinicial, datefinal)
                   .filterBounds(limites_ca)
                   .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 10))
                   .sort('CLOUDY_PIXEL_PERCENTAGE')
                   .map(function(img){
                     var t = img.select(['B4','B3','B2','B1','B5','B6','B7','B8','B8A', 'B9','B10', 'B11','B12']).divide(10000);
                     var out = t.copyProperties(img).copyProperties(img,['system:time_start']);
                   return out;
                     });
 
print(s2image_class,'s2image class')
 
// Obtém a imagem menos dublada
var s2leastCloud_class = s2image_class.median();
var reflec_min_class = s2leastCloud_class.clip(area_estudo);
var mapa = s2leastCloud_class.select('B4', 'B3', 'B2').clip(area_estudo);
 
 
// Aplicar classificação
var classificada = reflec_min_class.classify(classificador);
print(classificada,'classificada');
 
// Definição da paleta de cores para cada classe
var paletaDeClasses = [
'red', // urbano
'darkgreen', // vegetação natural
'lightgreen', // pastagem
'lime', //culturas
'orange', // solo exposto
'blue', // água
];
 
// ***NDVI***
// Parâmetros de visualização
var visParams = {bands: ['B8', 'B4', 'B3'], max: 3048, gamma: 1};
var visParams_ndvi = {min: -0.2, max: 0.8, palette: 'FFFFFF, CE7E45, DF923D, F1B555, FCD163, 99B718, 74A901, 66A000, 529400,' + '3E8601, 207401, 056201, 004C00, 023B01, 012E01, 011D01, 011301'};
 
// Cálculo do NDVI
var image = reflec_min_class.clip(area_estudo);
var image_ndvi = image.normalizedDifference(['B8','B4']);
print(image_ndvi,'ndvi');
// Resultados do Mapa
Map.centerObject(area_estudo);
Map.addLayer(image_ndvi,visParams_ndvi,'NDVI ' + dateinicial + ' à ' + datefinal);
Map.addLayer(mapa,{bands: ['B4', 'B3', 'B2'], min: 0, max: 0.3},'MAPA ' + dateinicial + ' à ' + datefinal);
Map.addLayer(classificada, {min: 1, max: 6, palette: paletaDeClasses}, 'CLASSIFICAÇÃO '+ cidade);
 
//*******cálculo de áreas das classes (retorna lista com valores)
var class_area = ee.Image.pixelArea().addBands(classificada)
 .reduceRegion({
   reducer: ee.Reducer.sum().group({
     groupField: 1,
     groupName: 'amostras',
   }),
   geometry: area_estudo,
   scale: 30, 
   maxPixels: 1e9
 }).get('groups');
print('Area by class (m2)', class_area);
 
 
// ***LEGENDA***
//Adição de legenda para facilitar a interpretação
//Posição do Painel
var legend = ui.Panel({
 style: {
   position: 'bottom-left',
   padding: '8px 15px'
 }
});
 
// Título da legenda
var legendTitle = ui.Label({
 value: 'Classificação',
 style: {
   fontWeight: 'bold',
   fontSize: '18px',
   margin: '0 0 4px 0',
   padding: '0'
   }
});
 
// Adiciona o título ao painel na tela
legend.add(legendTitle);
 
// Cria os estilos da legenda
var makeRow = function(color, name) {
 
     // Rótulos da legenda
     var colorBox = ui.Label({
         style: {
         backgroundColor: '#' + color,
         // Tamanho
         padding: '8px',
         margin: '0 0 4px 0'
       }
     });
 
     // Descrição
     var description = ui.Label({
             value: name,
           style: {margin: '0 0 4px 6px'}
     });
 
     // Retorna o painel
     return ui.Panel({
           widgets: [colorBox, description],
           layout: ui.Panel.Layout.Flow('horizontal')
     });
};
 
//  Paleta de cores para a legenda (em hexadecimal)
var palette =['d73027','1a9850','8FBC8F','00FF00','fdae61','0000ff'];
// Nomes para a legenda
var names = ['urbano','vegetação natural','pastagem','culturas','solo exposto','água'];
 
// Concatenação de Paletas
for (var i = 0; i < 6; i++) {
legend.add(makeRow(palette[i], names[i]));
 } 
 
// Adiciona a legenda ao mapa
Map.add(legend);
 
}
 
 
//***COMBOBOX MUNICÍPIOS***
// Cria um seletor de camada que determina qual camada está visível no mapa.
var select = ui.Select({
items: [AGUAS_DE_LINDOIA, AMPARO, HOLAMBRA, JAGUARIUNA, LINDOIA, MONTE_ALEGRE_DO_SUL, PEDREIRA, SERRA_NEGRA, SOCORRO],
     value: AGUAS_DE_LINDOIA,
     onChange: redraw,
});
panel.add(ui.Label('Escolha o Município:')).add(select);
 
var select2 = ui.Select({
 items: ['2016-01-01', '2016-12-31', '2017-01-01', '2017-12-31', '2018-01-01', '2018-12-31', '2019-01-01', '2019-12-31'],
     value: '2018-01-01',
     onChange: redraw,
});
panel.add(ui.Label('Escolha a data de início:')).add(select2);
 
var select3 = ui.Select({
 items: ['2016-01-01', '2016-12-31', '2017-12-31', '2017-12-31', '2018-01-01', '2018-12-31', '2019-01-01', '2019-12-31'],
     value: '2018-12-31',
     onChange: redraw,
});
panel.add(ui.Label('Escolha a data de fim:')).add(select3);
 
// Cria uma função para renderizar uma camada de mapa configurada pelas entradas do usuário.
 function redraw() {
     cidade = select.getValue();
     dateinicial = select2.getValue();
     datefinal = select3.getValue();
}
 
// Botão 'gerar mapa', chama as funções redraw(atribui os valores do menu) e classificação (classifica de acordo com redraw)
panel.add(ui.Button({label: 'Gerar mapa ', style: {stretch: 'horizontal'}, "onClick": function (){
 
 redraw();
     classificacao();
 }}));

