import { html, render as litRender } from '../lit-html/lit-html.js'

/**
 * Returns a class with the Lit-Element features, that extends `superclass`.
 * @param {*} superclass
 */
export const LitElement = (superclass) => class extends superclass {

    /**
     * The Attributes of the generated HTMLElement, that should be observed. These are all properties with `reflectToAttribute: true`
     * @readonly
     * @static
     */
    static get observedAttributes() {
        let attrs = [];
        for (const prop in this.properties)
            if (this.properties[prop].reflectToAttribute)
                attrs.push(prop)
        return attrs;
    }

    constructor() {
        super();
        this.__data = {};
        this._methodsToCall = {};
        this.attachShadow({ mode: "open" });

        // Generate propertyName <-> attribute-name mappings
        this._propAttr = new Map(); // propertyName   -> attribute-name
        this._attrProp = new Map(); // attribute-name -> propertyName
        for (let prop in this.constructor.properties) {
            const attr  = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
            this._propAttr.set( prop, attr );
            this._attrProp.set( attr, prop );
        }
    }

    /**
     * `connectedCallback` gets called when the element is added to the page.
     */
    connectedCallback() {
        const props = this.constructor.properties;
        this._wait = true;
        for (let prop in props)
            this._makeGetterSetter(prop, props[prop])
        delete this._wait;
        litRender(this.render(), this.shadowRoot);
        if (this.afterFirstRender)
            this.afterFirstRender();
    }


    /**
     * Creates the Propertyaccessors for the defined properties of the Element.
     * @param {any} prop 
     * @param {any} info
     */
    _makeGetterSetter(prop, info) {
        const attr  = this._propAttr.get( prop );

        Object.defineProperty(this, prop, {
            get() {
                return this.__data[prop]
            },
            set(val) {
                if (typeof info === 'object')
                    if (info.reflectToAttribute && (info.type === Object || info.type === Array))
                        console.warn('Rich Data shouldn\'t be set as attribte!')
                if (typeof info === 'object') {
                    if (info.reflectToAttribute) {
                        this.setAttribute(attr, val)
                    } else this.__data[prop] = val;
                } else this.__data[prop] = val;
                this._propertiesChanged(prop, val)
            }
        });

        if (typeof info === 'object') {
            if (info.observer) {
                if (this[info.observer]) {
                    this._methodsToCall[prop] = this[info.observer].bind(this);
                } else {
                    console.warn(`Method ${info.observer} not defined!`);
                }
            }
            if (info.value) {
                typeof info.value === 'function'
                    ? this[prop] = info.value()
                    : this[prop] = info.value;
            }
        }

        this[prop] = this.getAttribute( attr );
    }

    /**
     * Gets called when the properties change and the Element should rerender.
     * 
     * @param {any} prop 
     * @param {any} val 
     */
    _propertiesChanged(prop, val) {
        if (this._methodsToCall[prop]) {
            this._methodsToCall[prop](val);
        }
        if (!this._wait) {
            litRender(this.render(), this.shadowRoot)
        }
    }

    /**
     * Gets called when an observed attribute changes. Calls `_propertiesChanged`
     * 
     * @param {any} attr 
     * @param {any} old 
     * @param {any} val 
     */
    attributeChangedCallback(attr, old, val) {
        const prop  = this._attrProp( attr );

        if (this[prop] !== val) {
            const { type } = this.constructor.properties[prop];
            switch( type.name ) {
            case 'Boolean':
                /* Ensure attribute values the indicate that absense of the
                 * attribute actually cause the attribute to be absent.
                 */
                if (val === 'false' || val === 'null' ||
                    val === false   || val === null) {
                    if (this.hasAttribute( attr )) {
                        this.removeAttribute( attr );
                    }
                    this.__data[prop] = false
                } else {
                    this.__data[prop] = this.hasAttribute( attr );
                }
                break;

            case 'String':
                /* If a String value is falsey or the explicit 'null' string,
                 * ensure that the attribute is removed.
                 */
                if (!val || val === 'null') {
                    if (this.hasAttribute( attr )) {
                        this.removeAttribute( attr );
                    }
                    this.__data[prop] = '';

                } else {
                    this.__data[prop] = type(val);

                }
                break;

            default:
                this.__data[prop] = type(val);
                break;
            }

            /* Pass along the new, more concrete *property* value instead of
             * the fuzzy attribute value.
             */
            this._propertiesChanged(prop, this.__data[prop]);
        }
    }

    /**
     * Returns what lit-html should render.
     * 
     * @returns 
     */
    render() {
        return html`Render Function not defined`
    }

    /**
     * Gets all children with ids.
     * 
     * @readonly
     */
    get $() {
        const arr = this.shadowRoot.querySelectorAll('[id]');
        const obj = {};
        for (const el of arr)
            obj[el.id] = el;

        return obj;
    }
}
