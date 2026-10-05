-- Optional: nur nötig, wenn ox_inventory läuft und Config.Sample.UseInventory = true.
-- Diese beiden Einträge in ox_inventory/data/items.lua einfügen:

['sample_collection_kit'] = {
	label = 'Probenentnahmeset',
	weight = 500,
	stack = false,
	close = true,
	description = 'Set zur Entnahme von CBRN-Proben.',
},

['sample_container'] = {
	label = 'Probenbehälter',
	weight = 150,
	stack = false,
	close = true,
	description = 'Universal Sample Container mit Proben-ID.',
},
