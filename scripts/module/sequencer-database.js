import * as lib from './lib.js';

const SequencerDatabase = {

        entries: {},
        flattenedEntries: [],
		flattenedFiles: {},

    /**
     *  Registers a set of entries to the database on the given module name
     *
     * @param  {string}      moduleName    The namespace to assign to the inserted entries
     * @param  {object}      entries       The entries to merge into the database
     * @return {void}
     */
    registerEntries(moduleName, entries){
        console.log(`Sequencer | Database | Entries for "${moduleName}" registered`);
		this._flatten(entries, moduleName);
		this.entries = foundry.utils.mergeObject(this.entries,
			{ [moduleName]: this._processFiles(entries) }
		);
    },

    /**
     *  Quickly checks if the entry exists in the database
     *
     * @param  {string}      inString    The entry to find in the database
     * @return {boolean}                 If the entry exists in the database
     */
    entryExists(inString){
        inString = inString.replace(/\[[0-9]+]$/, "")
        return this.flattenedEntries.find(entry => entry.startsWith(inString));
    },

    /**
     *  Gets the entry in the database by a dot-notated string
     *
     * @param  {string}             inString    The entry to find in the database
     * @return {object|boolean}                 The found entry in the database, or false if not found (with warning)
     */
    getEntry(inString){
        inString = inString.replace(/\[[0-9]+]$/, "");
        if(!this.entryExists(inString)) return this._throwNotFound(inString);
        let parts = inString.split('.');
        let length = parts.length-1;

        let index = 0;
        let entry = parts?.[index];
        let currentInspect = this.entries?.[entry];

        while(index < length && currentInspect && entry){
            index++;
            entry = parts?.[index];
            currentInspect = currentInspect?.[entry];
        }

        if(!currentInspect) return this._throwNotFound(inString, entry);

		return currentInspect;
    },

    getAllFileEntries(inModule){
		if(!this.entryExists(inModule)) return this._throwNotFound(inModule);
    	return this.flattenedFiles[inModule];
	},

    _flatten(entries, inModule){

    	let flattened = lib.flattenObject(foundry.utils.duplicate({[inModule]: entries}));

        this.flattenedEntries = foundry.utils.mergeObject(this.flattenedEntries, Object.keys(flattened));

        this.flattenedFiles[inModule] = Array.from(new Set(lib.flattenObject(Object.values(flattened))));
    },

    _throwNotFound(inString, entry = false){
        let error = `Sequencer | Database | Could not find "${inString}" in database`;
        if(entry) error += ` - found entries up to: "${entry}"`;
        ui.notifications.error(error);
        console.error(error);
        return false;
    },

	_processFiles(entries){

		entries = foundry.utils.duplicate(entries);

    	let globalTemplate = entries._templates ?? false;

    	return this._recurseFiles(entries, globalTemplate);

	},

    _recurseFiles(entries, globalTemplate, template){

		if(entries._template){
			template = globalTemplate?.[entries._template] ?? template ?? globalTemplate?.["default"];
		}

		if(typeof entries === "string" || typeof entries?.file === "string"){

			entries = new lib.SequencerFile(entries, template);

		}else if(Array.isArray(entries)){

			let newEntries = [];
			for(let entry of entries){
				newEntries.push(this._recurseFiles(entry, globalTemplate, template));
			}
			entries = newEntries;

		}else{

			let foundDistances = Object.keys(entries).filter(entry => entry.endsWith('ft')).length !== 0;

			if(foundDistances){
				entries = new lib.SequencerFile(entries, template);
			}else {
				for (let entry of Object.keys(entries)) {
					if (entry.startsWith('_')) continue;
					entries[entry] = this._recurseFiles(entries[entry], globalTemplate, template);
				}
			}
		}

		return entries;
	}
}

export default SequencerDatabase;