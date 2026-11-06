// code|nom|capitale|continent|capitalesAutres(;)
const AF = 'Afrique', AN = 'Amérique du Nord', AS_ = 'Amérique du Sud', AI = 'Asie', EU = 'Europe', OC = 'Océanie';
const raw = `
dz|Algérie|Alger|AF
ao|Angola|Luanda|AF
bj|Bénin|Porto-Novo|AF|Cotonou
bw|Botswana|Gaborone|AF
bf|Burkina Faso|Ouagadougou|AF
bi|Burundi|Gitega|AF|Bujumbura
cv|Cap-Vert|Praia|AF
cm|Cameroun|Yaoundé|AF
cf|République centrafricaine|Bangui|AF
td|Tchad|N'Djamena|AF
km|Comores|Moroni|AF
cg|Congo|Brazzaville|AF
cd|République démocratique du Congo|Kinshasa|AF
ci|Côte d'Ivoire|Yamoussoukro|AF|Abidjan
dj|Djibouti|Djibouti|AF
eg|Égypte|Le Caire|AF
gq|Guinée équatoriale|Malabo|AF|Ciudad de la Paz
er|Érythrée|Asmara|AF
sz|Eswatini|Mbabane|AF|Lobamba
et|Éthiopie|Addis-Abeba|AF
ga|Gabon|Libreville|AF
gm|Gambie|Banjul|AF
gh|Ghana|Accra|AF
gn|Guinée|Conakry|AF
gw|Guinée-Bissau|Bissau|AF
ke|Kenya|Nairobi|AF
ls|Lesotho|Maseru|AF
lr|Liberia|Monrovia|AF
ly|Libye|Tripoli|AF
mg|Madagascar|Antananarivo|AF
mw|Malawi|Lilongwe|AF
ml|Mali|Bamako|AF
mr|Mauritanie|Nouakchott|AF
mu|Maurice|Port-Louis|AF
ma|Maroc|Rabat|AF
mz|Mozambique|Maputo|AF
na|Namibie|Windhoek|AF
ne|Niger|Niamey|AF
ng|Nigeria|Abuja|AF
rw|Rwanda|Kigali|AF
st|Sao Tomé-et-Principe|São Tomé|AF
sn|Sénégal|Dakar|AF
sc|Seychelles|Victoria|AF
sl|Sierra Leone|Freetown|AF
so|Somalie|Mogadiscio|AF
za|Afrique du Sud|Pretoria|AF|Le Cap;Bloemfontein
ss|Soudan du Sud|Djouba|AF
sd|Soudan|Khartoum|AF
tz|Tanzanie|Dodoma|AF|Dar es Salaam
tg|Togo|Lomé|AF
tn|Tunisie|Tunis|AF
ug|Ouganda|Kampala|AF
zm|Zambie|Lusaka|AF
zw|Zimbabwe|Harare|AF
ag|Antigua-et-Barbuda|Saint John's|AN
ar|Argentine|Buenos Aires|AS_
bs|Bahamas|Nassau|AN
bb|Barbade|Bridgetown|AN
bz|Belize|Belmopan|AN
bo|Bolivie|Sucre|AS_|La Paz
br|Brésil|Brasília|AS_
ca|Canada|Ottawa|AN
cl|Chili|Santiago|AS_|Valparaíso
co|Colombie|Bogota|AS_
cr|Costa Rica|San José|AN
cu|Cuba|La Havane|AN
dm|Dominique|Roseau|AN
do|République dominicaine|Saint-Domingue|AN
ec|Équateur|Quito|AS_
sv|Salvador|San Salvador|AN
gd|Grenade|Saint-Georges|AN
gt|Guatemala|Guatemala|AN
gy|Guyana|Georgetown|AS_
ht|Haïti|Port-au-Prince|AN
hn|Honduras|Tegucigalpa|AN
jm|Jamaïque|Kingston|AN
mx|Mexique|Mexico|AN
ni|Nicaragua|Managua|AN
pa|Panama|Panama|AN
py|Paraguay|Asunción|AS_
pe|Pérou|Lima|AS_
kn|Saint-Christophe-et-Niévès|Basseterre|AN
lc|Sainte-Lucie|Castries|AN
vc|Saint-Vincent-et-les-Grenadines|Kingstown|AN
sr|Suriname|Paramaribo|AS_
tt|Trinité-et-Tobago|Port-d'Espagne|AN
us|États-Unis|Washington|AN
uy|Uruguay|Montevideo|AS_
ve|Venezuela|Caracas|AS_
af|Afghanistan|Kaboul|AI
sa|Arabie saoudite|Riyad|AI
am|Arménie|Erevan|AI
az|Azerbaïdjan|Bakou|AI
bh|Bahreïn|Manama|AI
bd|Bangladesh|Dacca|AI
bt|Bhoutan|Thimphou|AI
bn|Brunei|Bandar Seri Begawan|AI
kh|Cambodge|Phnom Penh|AI
cn|Chine|Pékin|AI
cy|Chypre|Nicosie|EU
kp|Corée du Nord|Pyongyang|AI
kr|Corée du Sud|Séoul|AI
ae|Émirats arabes unis|Abou Dabi|AI
ge|Géorgie|Tbilissi|AI
in|Inde|New Delhi|AI
id|Indonésie|Jakarta|AI|Nusantara
iq|Irak|Bagdad|AI
ir|Iran|Téhéran|AI
il|Israël|Jérusalem|AI
jp|Japon|Tokyo|AI
jo|Jordanie|Amman|AI
kz|Kazakhstan|Astana|AI
kg|Kirghizistan|Bichkek|AI
kw|Koweït|Koweït|AI
la|Laos|Vientiane|AI
lb|Liban|Beyrouth|AI
my|Malaisie|Kuala Lumpur|AI|Putrajaya
mv|Maldives|Malé|AI
mn|Mongolie|Oulan-Bator|AI
mm|Birmanie|Naypyidaw|AI
np|Népal|Katmandou|AI
om|Oman|Mascate|AI
uz|Ouzbékistan|Tachkent|AI
pk|Pakistan|Islamabad|AI
ph|Philippines|Manille|AI
qa|Qatar|Doha|AI
sg|Singapour|Singapour|AI
lk|Sri Lanka|Sri Jayawardenapura Kotte|AI|Colombo
sy|Syrie|Damas|AI
tj|Tadjikistan|Douchanbé|AI
th|Thaïlande|Bangkok|AI
tl|Timor oriental|Dili|AI
tm|Turkménistan|Achgabat|AI
tr|Turquie|Ankara|AI
vn|Viêt Nam|Hanoï|AI
ye|Yémen|Sanaa|AI|Aden
al|Albanie|Tirana|EU
de|Allemagne|Berlin|EU
ad|Andorre|Andorre-la-Vieille|EU
at|Autriche|Vienne|EU
be|Belgique|Bruxelles|EU
by|Biélorussie|Minsk|EU
ba|Bosnie-Herzégovine|Sarajevo|EU
bg|Bulgarie|Sofia|EU
hr|Croatie|Zagreb|EU
dk|Danemark|Copenhague|EU
es|Espagne|Madrid|EU
ee|Estonie|Tallinn|EU
fi|Finlande|Helsinki|EU
fr|France|Paris|EU
gr|Grèce|Athènes|EU
hu|Hongrie|Budapest|EU
ie|Irlande|Dublin|EU
is|Islande|Reykjavik|EU
it|Italie|Rome|EU
lv|Lettonie|Riga|EU
li|Liechtenstein|Vaduz|EU
lt|Lituanie|Vilnius|EU
lu|Luxembourg|Luxembourg|EU
mk|Macédoine du Nord|Skopje|EU
mt|Malte|La Valette|EU
md|Moldavie|Chisinau|EU
mc|Monaco|Monaco|EU
me|Monténégro|Podgorica|EU|Cetinje
no|Norvège|Oslo|EU
nl|Pays-Bas|Amsterdam|EU|La Haye
pl|Pologne|Varsovie|EU
pt|Portugal|Lisbonne|EU
cz|Tchéquie|Prague|EU
ro|Roumanie|Bucarest|EU
gb|Royaume-Uni|Londres|EU
ru|Russie|Moscou|EU
sm|Saint-Marin|Saint-Marin|EU
rs|Serbie|Belgrade|EU
sk|Slovaquie|Bratislava|EU
si|Slovénie|Ljubljana|EU
se|Suède|Stockholm|EU
ch|Suisse|Berne|EU
ua|Ukraine|Kiev|EU
au|Australie|Canberra|OC
fj|Fidji|Suva|OC
sb|Îles Salomon|Honiara|OC
ki|Kiribati|Tarawa-Sud|OC
mh|Îles Marshall|Majuro|OC
fm|Micronésie|Palikir|OC
nr|Nauru|Yaren|OC
nz|Nouvelle-Zélande|Wellington|OC
pw|Palaos|Ngerulmud|OC
pg|Papouasie-Nouvelle-Guinée|Port Moresby|OC
ws|Samoa|Apia|OC
to|Tonga|Nuku'alofa|OC
tv|Tuvalu|Funafuti|OC
vu|Vanuatu|Port-Vila|OC
va|Vatican|Vatican|EU
ps|Palestine|Jérusalem-Est|AI|Ramallah
`.trim().split('\n');
const C = { AF, AN, AS_, AI, EU, OC };
export const pays = raw.map(l => {
  const [code, nom, capitale, cont, autres] = l.split('|');
  return {
    code, nom, capitale,
    capitalesAutres: autres ? autres.split(';') : [],
    drapeau: `flags/${code}.svg`,
    continent: C[cont],
    statut: (code === 'va' || code === 'ps') ? 'observateur' : 'membre_onu',
  };
});
