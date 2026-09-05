const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/exports-kVNkuTx1.js","assets/vanilla-BeoZKqUW.js","assets/esm-BLj1GFe1.js","assets/browser-CS7DgBhO.js","assets/index-B3y3thf1.js","assets/index-C1DeGNpd.css"])))=>i.map(i=>d[i]);
import{F as e,M as t,P as n,V as r,W as i,a,g as o,h as s,i as c,o as l,v as u,z as d}from"./esm-BLj1GFe1.js";import{a as f,c as p,i as m,o as h,s as g}from"./index-B3y3thf1.js";var _=g`
  :host {
    z-index: var(--w3m-z-index);
    display: block;
    backface-visibility: hidden;
    will-change: opacity;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    opacity: 0;
    background-color: var(--wui-cover);
    transition: opacity 0.2s var(--wui-ease-out-power-2);
    will-change: opacity;
  }

  :host(.open) {
    opacity: 1;
  }

  wui-card {
    max-width: var(--w3m-modal-width);
    width: 100%;
    position: relative;
    animation: zoom-in 0.2s var(--wui-ease-out-power-2);
    animation-fill-mode: backwards;
    outline: none;
  }

  wui-card[shake='true'] {
    animation:
      zoom-in 0.2s var(--wui-ease-out-power-2),
      w3m-shake 0.5s var(--wui-ease-out-power-2);
  }

  wui-flex {
    overflow-x: hidden;
    overflow-y: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
  }

  @media (max-height: 700px) and (min-width: 431px) {
    wui-flex {
      align-items: flex-start;
    }

    wui-card {
      margin: var(--wui-spacing-xxl) 0px;
    }
  }

  @media (max-width: 430px) {
    wui-flex {
      align-items: flex-end;
    }

    wui-card {
      max-width: 100%;
      border-bottom-left-radius: 0;
      border-bottom-right-radius: 0;
      border-bottom: none;
      animation: slide-in 0.2s var(--wui-ease-out-power-2);
    }

    wui-card[shake='true'] {
      animation:
        slide-in 0.2s var(--wui-ease-out-power-2),
        w3m-shake 0.5s var(--wui-ease-out-power-2);
    }
  }

  @keyframes zoom-in {
    0% {
      transform: scale(0.95) translateY(0);
    }
    100% {
      transform: scale(1) translateY(0);
    }
  }

  @keyframes slide-in {
    0% {
      transform: scale(1) translateY(50px);
    }
    100% {
      transform: scale(1) translateY(0);
    }
  }

  @keyframes w3m-shake {
    0% {
      transform: scale(1) rotate(0deg);
    }
    20% {
      transform: scale(1) rotate(-1deg);
    }
    40% {
      transform: scale(1) rotate(1.5deg);
    }
    60% {
      transform: scale(1) rotate(-1.5deg);
    }
    80% {
      transform: scale(1) rotate(1deg);
    }
    100% {
      transform: scale(1) rotate(0deg);
    }
  }

  @keyframes w3m-view-height {
    from {
      height: var(--prev-height);
    }
    to {
      height: var(--new-height);
    }
  }
`,v=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},y=`scroll-lock`,b=class extends f{constructor(){super(),this.unsubscribe=[],this.abortController=void 0,this.open=s.state.open,this.caipAddress=o.state.caipAddress,this.isSiweEnabled=n.state.isSiweEnabled,this.connected=o.state.isConnected,this.loading=s.state.loading,this.shake=s.state.shake,this.initializeTheming(),e.prefetch(),this.unsubscribe.push(s.subscribeKey(`open`,e=>e?this.onOpen():this.onClose()),s.subscribeKey(`shake`,e=>this.shake=e),s.subscribeKey(`loading`,e=>{this.loading=e,this.onNewAddress(o.state.caipAddress)}),o.subscribeKey(`isConnected`,e=>this.connected=e),o.subscribeKey(`caipAddress`,e=>this.onNewAddress(e)),n.subscribeKey(`isSiweEnabled`,e=>this.isSiweEnabled=e)),d.sendEvent({type:`track`,event:`MODAL_LOADED`})}disconnectedCallback(){this.unsubscribe.forEach(e=>e()),this.onRemoveKeyboardListener()}render(){return this.open?h`
          <wui-flex @click=${this.onOverlayClick.bind(this)} data-testid="w3m-modal-overlay">
            <wui-card
              shake="${this.shake}"
              role="alertdialog"
              aria-modal="true"
              tabindex="0"
              data-testid="w3m-modal-card"
            >
              <w3m-header></w3m-header>
              <w3m-router></w3m-router>
              <w3m-snackbar></w3m-snackbar>
            </wui-card>
          </wui-flex>
          <w3m-tooltip></w3m-tooltip>
        `:null}async onOverlayClick(e){e.target===e.currentTarget&&await this.handleClose()}async handleClose(){let e=u.state.view===`ConnectingSiwe`,t=u.state.view===`ApproveTransaction`;if(this.isSiweEnabled){let{SIWEController:n}=await p(async()=>{let{SIWEController:e}=await import(`./exports-kVNkuTx1.js`);return{SIWEController:e}},__vite__mapDeps([0,1,2,3,4,5]));n.state.status!==`success`&&(e||t)?s.shake():s.close()}else s.close()}initializeTheming(){let{themeVariables:e,themeMode:t}=r.state,n=c.getColorTheme(t);l(e,n)}onClose(){this.open=!1,this.classList.remove(`open`),this.onScrollUnlock(),t.hide(),this.onRemoveKeyboardListener()}onOpen(){this.open=!0,this.classList.add(`open`),this.onScrollLock(),this.onAddKeyboardListener()}onScrollLock(){let e=document.createElement(`style`);e.dataset.w3m=y,e.textContent=`
      body {
        touch-action: none;
        overflow: hidden;
        overscroll-behavior: contain;
      }
      w3m-modal {
        pointer-events: auto;
      }
    `,document.head.appendChild(e)}onScrollUnlock(){let e=document.head.querySelector(`style[data-w3m="${y}"]`);e&&e.remove()}onAddKeyboardListener(){this.abortController=new AbortController;let e=this.shadowRoot?.querySelector(`wui-card`);e?.focus(),window.addEventListener(`keydown`,t=>{if(t.key===`Escape`)this.handleClose();else if(t.key===`Tab`){let{tagName:n}=t.target;n&&!n.includes(`W3M-`)&&!n.includes(`WUI-`)&&e?.focus()}},this.abortController)}onRemoveKeyboardListener(){this.abortController?.abort(),this.abortController=void 0}async onNewAddress(e){if(!this.connected||this.loading)return;let t=i.getPlainAddress(this.caipAddress),n=i.getPlainAddress(e),r=i.getNetworkId(this.caipAddress),a=i.getNetworkId(e);if(this.caipAddress=e,this.isSiweEnabled){let{SIWEController:e}=await p(async()=>{let{SIWEController:e}=await import(`./exports-kVNkuTx1.js`);return{SIWEController:e}},__vite__mapDeps([0,1,2,3,4,5])),i=await e.getSession();if(i&&t&&n&&t!==n){e.state._client?.options.signOutOnAccountChange&&(await e.signOut(),this.onSiweNavigation());return}if(i&&r&&a&&r!==a){e.state._client?.options.signOutOnNetworkChange&&(await e.signOut(),this.onSiweNavigation());return}this.onSiweNavigation()}}onSiweNavigation(){this.open?u.push(`ConnectingSiwe`):s.open({view:`ConnectingSiwe`})}};b.styles=_,v([m()],b.prototype,`open`,void 0),v([m()],b.prototype,`caipAddress`,void 0),v([m()],b.prototype,`isSiweEnabled`,void 0),v([m()],b.prototype,`connected`,void 0),v([m()],b.prototype,`loading`,void 0),v([m()],b.prototype,`shake`,void 0),b=v([a(`w3m-modal`)],b);export{b as W3mModal};