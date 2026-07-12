/* @ds-bundle: {"format":4,"namespace":"IonixDesignSystem_1a028d","components":[{"name":"Card","sourcePath":"components/cards/Card.jsx"},{"name":"IconCircle","sourcePath":"components/cards/IconCircle.jsx"},{"name":"StatBlock","sourcePath":"components/cards/StatBlock.jsx"},{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Textarea","sourcePath":"components/forms/Textarea.jsx"},{"name":"Accordion","sourcePath":"components/navigation/Accordion.jsx"},{"name":"MarketingAbout","sourcePath":"ui_kits/marketing-site/MarketingAbout.jsx"},{"name":"MarketingBlog","sourcePath":"ui_kits/marketing-site/MarketingBlog.jsx"},{"name":"MarketingClients","sourcePath":"ui_kits/marketing-site/MarketingClients.jsx"},{"name":"MarketingCtaTrio","sourcePath":"ui_kits/marketing-site/MarketingCtaTrio.jsx"},{"name":"MarketingFaq","sourcePath":"ui_kits/marketing-site/MarketingFaq.jsx"},{"name":"MarketingFeatureSplit","sourcePath":"ui_kits/marketing-site/MarketingFeatureSplit.jsx"},{"name":"MarketingFooter","sourcePath":"ui_kits/marketing-site/MarketingFooter.jsx"},{"name":"MarketingHeader","sourcePath":"ui_kits/marketing-site/MarketingHeader.jsx"},{"name":"MarketingHero","sourcePath":"ui_kits/marketing-site/MarketingHero.jsx"},{"name":"MarketingIndustries","sourcePath":"ui_kits/marketing-site/MarketingIndustries.jsx"},{"name":"MarketingLeadForm","sourcePath":"ui_kits/marketing-site/MarketingLeadForm.jsx"},{"name":"MarketingTrustStats","sourcePath":"ui_kits/marketing-site/MarketingTrustStats.jsx"}],"sourceHashes":{"components/cards/Card.jsx":"de67f1223522","components/cards/IconCircle.jsx":"588b2f8185a5","components/cards/StatBlock.jsx":"5c173805891c","components/core/Badge.jsx":"aa1f480e9146","components/core/Button.jsx":"36f1ef01b93b","components/forms/Input.jsx":"f6401856cfc5","components/forms/Select.jsx":"72a70603f869","components/forms/Textarea.jsx":"aa2b4a422b24","components/navigation/Accordion.jsx":"96fb058c3d97","ui_kits/marketing-site/MarketingAbout.jsx":"818bbf11f4fa","ui_kits/marketing-site/MarketingBlog.jsx":"b9b12d28412e","ui_kits/marketing-site/MarketingClients.jsx":"b59d59399588","ui_kits/marketing-site/MarketingCtaTrio.jsx":"e6bb974f9c86","ui_kits/marketing-site/MarketingFaq.jsx":"53f51b33e909","ui_kits/marketing-site/MarketingFeatureSplit.jsx":"66dd43fa9c80","ui_kits/marketing-site/MarketingFooter.jsx":"185b8138443c","ui_kits/marketing-site/MarketingHeader.jsx":"325029cc94a1","ui_kits/marketing-site/MarketingHero.jsx":"c99d20616322","ui_kits/marketing-site/MarketingIndustries.jsx":"70d97cd774d7","ui_kits/marketing-site/MarketingLeadForm.jsx":"00dbad160d96","ui_kits/marketing-site/MarketingTrustStats.jsx":"310fb510f8f7"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.IonixDesignSystem_1a028d = window.IonixDesignSystem_1a028d || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/cards/Card.jsx
try { (() => {
const variantBg = {
  default: 'var(--bg-surface)',
  sunken: 'var(--bg-surface-sunken)'
};

/**
 * Card — generic dark surface container. Used for feature panels, industry
 * cards, and client-logo cards. No drop shadow by design: elevation reads
 * through surface-fill + hairline border contrast against the page bg.
 */
function Card({
  variant = 'default',
  padding = 32,
  children,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: variantBg[variant] || variantBg.default,
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-lg)',
      padding,
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/cards/Card.jsx", error: String((e && e.message) || e) }); }

// components/cards/IconCircle.jsx
try { (() => {
const sizes = {
  sm: 40,
  md: 56
};

/**
 * IconCircle — solid-color circular swatch wrapping a small icon glyph.
 * Used in the "Ionix Combina Visión Regional..." CTA trio (orange circle
 * + white icon). A square variant of the same idea (rounded-square, not
 * circle) appears on industry cards — pass shape="square" for that.
 */
function IconCircle({
  icon,
  size = 'md',
  color = 'var(--accent-primary)',
  shape = 'circle',
  style
}) {
  const px = sizes[size] || sizes.md;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: px,
      height: px,
      borderRadius: shape === 'circle' ? '50%' : 'var(--radius-sm)',
      background: color,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      flexShrink: 0,
      ...style
    }
  }, icon);
}
Object.assign(__ds_scope, { IconCircle });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/cards/IconCircle.jsx", error: String((e && e.message) || e) }); }

// components/cards/StatBlock.jsx
try { (() => {
/**
 * StatBlock — big number + small caption, used inside the gradient trust
 * ribbon near the top of the page ("+15 Años De Experiencia").
 */
function StatBlock({
  value,
  label,
  align = 'center',
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: align,
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--text-display-lg)',
      fontFamily: 'var(--font-display)',
      color: 'var(--text-primary)',
      marginBottom: 4
    }
  }, value), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--text-label)',
      fontFamily: 'var(--font-body)',
      letterSpacing: 'var(--tracking-eyebrow)',
      textTransform: 'uppercase',
      color: 'rgba(255,255,255,0.85)'
    }
  }, label));
}
Object.assign(__ds_scope, { StatBlock });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/cards/StatBlock.jsx", error: String((e && e.message) || e) }); }

// components/core/Badge.jsx
try { (() => {
/**
 * Badge — small outlined pill used as a section "eyebrow" label
 * ("IONIX TRUST," "INDUSTRIAS," "¿POR QUÉ IONIX?"). Always uppercase,
 * always a thin blue-bordered pill on transparent background.
 */
function Badge({
  children,
  style
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      padding: '8px 20px',
      borderRadius: 'var(--radius-pill)',
      border: '1.5px solid var(--border-accent-blue)',
      color: 'var(--text-primary)',
      font: 'var(--text-eyebrow)',
      fontFamily: 'var(--font-body)',
      letterSpacing: 'var(--tracking-eyebrow)',
      textTransform: 'uppercase',
      whiteSpace: 'nowrap',
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
const baseStyle = {
  fontFamily: 'var(--font-body)',
  fontWeight: 600,
  fontSize: 14,
  letterSpacing: 'var(--tracking-button)',
  textTransform: 'uppercase',
  border: 'none',
  borderRadius: 'var(--radius-pill)',
  padding: '16px 32px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  cursor: 'pointer',
  transition: 'opacity 0.15s ease, transform 0.1s ease',
  whiteSpace: 'nowrap'
};
const sizeStyles = {
  md: {
    padding: '16px 32px',
    fontSize: 14
  },
  sm: {
    padding: '11px 22px',
    fontSize: 12
  }
};
const variantStyles = {
  primary: {
    background: 'var(--gradient-cta)',
    color: 'var(--text-on-accent)'
  },
  secondary: {
    background: 'transparent',
    color: 'var(--text-primary)',
    border: '1.5px solid var(--border-accent-blue)'
  },
  ghost: {
    background: 'transparent',
    color: 'var(--text-primary)',
    padding: '0',
    textTransform: 'none',
    fontWeight: 600,
    fontSize: 16,
    letterSpacing: 0
  }
};

/**
 * Button — the site's only interactive-action primitive. Always pill-
 * shaped except the `ghost` text-link variant. Primary uses the brand
 * orange→blue gradient fill; secondary is a blue-outlined pill (often
 * paired with a small leading icon); ghost is an inline text link with a
 * trailing arrow, used in the footer CTA.
 */
function Button({
  variant = 'primary',
  size = 'md',
  icon = null,
  disabled = false,
  children,
  onClick,
  style
}) {
  const isGhost = variant === 'ghost';
  const merged = {
    ...baseStyle,
    ...(isGhost ? {} : sizeStyles[size]),
    ...variantStyles[variant],
    opacity: disabled ? 0.45 : 1,
    pointerEvents: disabled ? 'none' : 'auto',
    ...style
  };
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    style: merged,
    onClick: onClick,
    onMouseEnter: e => {
      if (!disabled) e.currentTarget.style.opacity = '0.85';
    },
    onMouseLeave: e => {
      if (!disabled) e.currentTarget.style.opacity = '1';
    },
    onMouseDown: e => {
      if (!disabled) e.currentTarget.style.transform = 'scale(0.97)';
    },
    onMouseUp: e => {
      if (!disabled) e.currentTarget.style.transform = 'scale(1)';
    }
  }, icon, children, isGhost && /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "\u2192"));
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
/**
 * Input — white rounded text field used in the lead-capture form. Text
 * fields on this site are always solid white regardless of the dark page
 * background (high-contrast, form-first pattern).
 */
function Input({
  label,
  placeholder,
  type = 'text',
  value,
  onChange,
  style
}) {
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      fontFamily: 'var(--font-body)'
    }
  }, label && /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--text-label)',
      color: 'var(--text-primary)'
    }
  }, label), /*#__PURE__*/React.createElement("input", {
    type: type,
    placeholder: placeholder,
    value: value,
    onChange: onChange,
    style: {
      background: 'var(--bg-input)',
      color: 'var(--bg-input-text)',
      border: 'none',
      borderRadius: 'var(--radius-md)',
      padding: '14px 18px',
      font: 'var(--text-body-md)',
      fontFamily: 'var(--font-body)',
      outline: 'none',
      width: '100%',
      ...style
    }
  }));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
/**
 * Select — white rounded dropdown, matches Input/Textarea. Used for the
 * "¿De dónde nos visitas?" country field.
 */
function Select({
  label,
  value,
  onChange,
  options = [],
  style
}) {
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      fontFamily: 'var(--font-body)'
    }
  }, label && /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--text-label)',
      color: 'var(--text-primary)'
    }
  }, label), /*#__PURE__*/React.createElement("select", {
    value: value,
    onChange: onChange,
    style: {
      background: 'var(--bg-input)',
      color: 'var(--bg-input-text)',
      border: 'none',
      borderRadius: 'var(--radius-md)',
      padding: '14px 18px',
      font: 'var(--text-body-md)',
      fontFamily: 'var(--font-body)',
      outline: 'none',
      width: '100%',
      appearance: 'auto',
      ...style
    }
  }, options.map(opt => /*#__PURE__*/React.createElement("option", {
    key: opt,
    value: opt
  }, opt))));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/forms/Textarea.jsx
try { (() => {
/**
 * Textarea — matches Input styling, used for the optional message field.
 */
function Textarea({
  label,
  placeholder,
  rows = 4,
  value,
  onChange,
  style
}) {
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      fontFamily: 'var(--font-body)'
    }
  }, label && /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--text-label)',
      color: 'var(--text-primary)'
    }
  }, label), /*#__PURE__*/React.createElement("textarea", {
    placeholder: placeholder,
    rows: rows,
    value: value,
    onChange: onChange,
    style: {
      background: 'var(--bg-input)',
      color: 'var(--bg-input-text)',
      border: 'none',
      borderRadius: 'var(--radius-md)',
      padding: '14px 18px',
      font: 'var(--text-body-md)',
      fontFamily: 'var(--font-body)',
      outline: 'none',
      resize: 'vertical',
      width: '100%',
      ...style
    }
  }));
}
Object.assign(__ds_scope, { Textarea });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Textarea.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Accordion.jsx
try { (() => {
const {
  useState
} = React;
const ChevronIcon = ({
  open
}) => /*#__PURE__*/React.createElement("svg", {
  width: "16",
  height: "16",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "2.5",
  style: {
    transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
    transition: 'transform 0.2s ease'
  }
}, /*#__PURE__*/React.createElement("path", {
  d: "M6 9l6 6 6-6",
  strokeLinecap: "round",
  strokeLinejoin: "round"
}));
const PlusIcon = ({
  open
}) => /*#__PURE__*/React.createElement("svg", {
  width: "16",
  height: "16",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "2.5"
}, /*#__PURE__*/React.createElement("path", {
  d: "M12 5v14",
  strokeLinecap: "round",
  style: {
    opacity: open ? 0 : 1,
    transition: 'opacity 0.15s'
  }
}), /*#__PURE__*/React.createElement("path", {
  d: "M5 12h14",
  strokeLinecap: "round"
}));

/**
 * Accordion — expand/collapse list used for FAQs (chevron affordance) and
 * for the nested "Solución" / "Impacto" rows inside each industry card
 * (plus/minus affordance). Pass `icon="chevron"` or `icon="plus"`.
 */
function Accordion({
  items = [],
  icon = 'chevron',
  defaultOpenIndex = 0
}) {
  const [openIndex, setOpenIndex] = useState(defaultOpenIndex);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, items.map((item, i) => {
    const open = openIndex === i;
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        background: open ? 'var(--bg-surface)' : 'var(--bg-surface-sunken)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        transition: 'background 0.15s ease'
      }
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => setOpenIndex(open ? -1 : i),
      style: {
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        background: 'transparent',
        border: 'none',
        color: 'var(--text-primary)',
        padding: '18px 20px',
        font: 'var(--text-body-md)',
        fontWeight: 600,
        fontFamily: 'var(--font-body)',
        textAlign: 'left',
        cursor: 'pointer'
      }
    }, /*#__PURE__*/React.createElement("span", null, item.title), icon === 'chevron' ? /*#__PURE__*/React.createElement(ChevronIcon, {
      open: open
    }) : /*#__PURE__*/React.createElement(PlusIcon, {
      open: open
    })), open && item.content && /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '0 20px 18px',
        font: 'var(--text-body-sm)',
        fontFamily: 'var(--font-body)',
        color: 'var(--text-secondary)'
      }
    }, item.content));
  }));
}
Object.assign(__ds_scope, { Accordion });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Accordion.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing-site/MarketingAbout.jsx
try { (() => {
function MarketingAbout() {
  const {
    Badge
  } = window.IonixDesignSystem_1a028d;
  return /*#__PURE__*/React.createElement("section", {
    style: {
      padding: '96px 48px',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 64,
      alignItems: 'center',
      maxWidth: 1200,
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement(Badge, null, "Ionix")), /*#__PURE__*/React.createElement("h2", {
    className: "type-display-lg",
    style: {
      marginBottom: 20
    }
  }, "\xBFQui\xE9nes Somos?"), /*#__PURE__*/React.createElement("p", {
    className: "type-body-md",
    style: {
      marginBottom: 24
    }
  }, "Ionix es una compa\xF1\xEDa tecnol\xF3gica enfocada en construir infraestructura de confianza digital y seguridad transaccional en Latinoam\xE9rica. Integramos capacidades avanzadas de identidad, autenticaci\xF3n y prevenci\xF3n de fraude para que organizaciones de servicios financieros, banca, retail, telecomunicaciones, seguros y sector p\xFAblico operen procesos cr\xEDticos con control, inteligencia y escalabilidad."), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 28,
      height: 28,
      borderRadius: '50%',
      background: 'var(--accent-secondary)',
      marginBottom: 12
    }
  }), /*#__PURE__*/React.createElement("h3", {
    className: "type-display-sm",
    style: {
      marginBottom: 12
    }
  }, "Trabajamos Con Servicios Certificados"), /*#__PURE__*/React.createElement("p", {
    className: "type-body-md",
    style: {
      marginBottom: 28
    }
  }, "Nuestro equipo de profesionales en continuidad de negocios, riesgos, cumplimiento y seguridad, aseguran que las soluciones transaccionales, productos y servicios resguarden los activos de nuestros clientes, adem\xE1s, estamos avalados por entidades de standard internacional."), /*#__PURE__*/React.createElement("img", {
    src: "../../assets/certifications/certification-badges.png",
    alt: "Certificaciones DRI, PCI-DSS, SOC, CMF",
    style: {
      height: 44
    }
  })), /*#__PURE__*/React.createElement("img", {
    src: "../../assets/photography/team-collaboration-bw.jpg",
    alt: "Equipo Ionix colaborando",
    style: {
      width: '100%',
      borderRadius: 'var(--radius-lg)',
      display: 'block'
    }
  }));
}
Object.assign(__ds_scope, { MarketingAbout });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing-site/MarketingAbout.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing-site/MarketingBlog.jsx
try { (() => {
const posts = [{
  img: '../../assets/photography/editorial-security-alert.jpg',
  title: 'Cómo mejorar la prevención antifraude con decisiones basadas en contexto'
}, {
  img: '../../assets/photography/editorial-digital-network.jpg',
  title: '¿Cómo funciona la huella digital en los procesos de autenticación?'
}, {
  img: '../../assets/photography/editorial-compliance-desk.jpg',
  title: '¿Qué es ISO 27001 y qué requisitos establece?'
}];
function MarketingBlog() {
  const {
    Button
  } = window.IonixDesignSystem_1a028d;
  return /*#__PURE__*/React.createElement("section", {
    style: {
      padding: '0 48px 96px',
      maxWidth: 1200,
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement("h2", {
    className: "type-display-md",
    style: {
      marginBottom: 28
    }
  }, "Blog"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 24
    }
  }, posts.map(p => /*#__PURE__*/React.createElement("div", {
    key: p.title
  }, /*#__PURE__*/React.createElement("img", {
    src: p.img,
    alt: "",
    style: {
      width: '100%',
      height: 160,
      objectFit: 'cover',
      borderRadius: 'var(--radius-lg)',
      marginBottom: 16,
      display: 'block'
    }
  }), /*#__PURE__*/React.createElement("h3", {
    className: "type-body-md",
    style: {
      color: 'var(--text-primary)',
      fontWeight: 600,
      marginBottom: 16
    }
  }, p.title), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "sm"
  }, "Leer M\xE1s")))));
}
Object.assign(__ds_scope, { MarketingBlog });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing-site/MarketingBlog.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing-site/MarketingClients.jsx
try { (() => {
const clients = [{
  logo: 'assets/client-edenred.png',
  name: 'Edenred',
  sub: 'Soluciones en beneficios corporativos',
  desc: 'Implementación de soluciones tecnológicas y de integración para plataformas de beneficios y pagos digitales en LATAM.'
}, {
  logo: 'assets/client-mach.png',
  name: 'MACH Bci',
  sub: 'Banco digital',
  desc: 'Desarrollo e integración de soluciones tecnológicas para programas estatales de beneficios.'
}, {
  logo: 'assets/client-chilexpress.png',
  name: 'Chile Express',
  sub: 'Servicio Courier envíos internacionales',
  desc: 'Proyectos de integración tecnológica y analítica para operaciones de servicios financieros y logística.'
}];
function MarketingClients() {
  const {
    Badge,
    Card
  } = window.IonixDesignSystem_1a028d;
  return /*#__PURE__*/React.createElement("section", {
    style: {
      padding: '96px 48px',
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement(Badge, null, "Nuestros Clientes")), /*#__PURE__*/React.createElement("h2", {
    className: "type-display-lg",
    style: {
      marginBottom: 16
    }
  }, "Empresas Que Conf\xEDan En Nosotros"), /*#__PURE__*/React.createElement("p", {
    className: "type-body-md",
    style: {
      maxWidth: 640,
      margin: '0 auto 48px'
    }
  }, "Trabajamos con empresas referentes en servicios financieros, retail, telecomunicaciones, seguros y sector p\xFAblico, acompa\xF1\xE1ndolas en la protecci\xF3n de su infraestructura transaccional y de identidad."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 24,
      maxWidth: 1100,
      margin: '0 auto',
      textAlign: 'left'
    }
  }, clients.map(c => /*#__PURE__*/React.createElement(Card, {
    key: c.name
  }, /*#__PURE__*/React.createElement("img", {
    src: c.logo,
    alt: c.name,
    style: {
      width: 56,
      height: 56,
      borderRadius: 12,
      marginBottom: 16,
      display: 'block'
    }
  }), /*#__PURE__*/React.createElement("h3", {
    className: "type-display-sm",
    style: {
      fontSize: 17,
      marginBottom: 2
    }
  }, c.name), /*#__PURE__*/React.createElement("div", {
    className: "type-body-sm",
    style: {
      marginBottom: 12
    }
  }, c.sub), /*#__PURE__*/React.createElement("p", {
    className: "type-body-sm"
  }, c.desc)))));
}
Object.assign(__ds_scope, { MarketingClients });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing-site/MarketingClients.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing-site/MarketingCtaTrio.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const PhoneIcon = p => /*#__PURE__*/React.createElement("svg", _extends({
  width: "20",
  height: "20",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "2"
}, p), /*#__PURE__*/React.createElement("path", {
  d: "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92z",
  strokeLinejoin: "round",
  strokeLinecap: "round"
}));
const CubeIcon = p => /*#__PURE__*/React.createElement("svg", _extends({
  width: "20",
  height: "20",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "2"
}, p), /*#__PURE__*/React.createElement("path", {
  d: "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z",
  strokeLinejoin: "round"
}), /*#__PURE__*/React.createElement("polyline", {
  points: "3.27 6.96 12 12.01 20.73 6.96"
}), /*#__PURE__*/React.createElement("line", {
  x1: "12",
  y1: "22.08",
  x2: "12",
  y2: "12"
}));
const PlayIcon = p => /*#__PURE__*/React.createElement("svg", _extends({
  width: "18",
  height: "18",
  viewBox: "0 0 24 24",
  fill: "currentColor"
}, p), /*#__PURE__*/React.createElement("polygon", {
  points: "6 3 20 12 6 21 6 3"
}));
const items = [{
  icon: PhoneIcon,
  title: 'Asesoría Especializada',
  body: 'Analicemos tus procesos críticos de identidad y antifraude y evaluemos dónde la orquestación puede generar impacto real en conversión, control y costos.',
  cta: 'Hablar Con Un Experto'
}, {
  icon: CubeIcon,
  title: 'Desarrollo De Proyectos Estratégicos',
  body: 'Convertimos necesidades regulatorias, operativas o de mitigación de fraude en soluciones estructuradas, gobernadas y escalables para organizaciones en LATAM.',
  cta: 'Iniciar Proyecto'
}, {
  icon: PlayIcon,
  title: 'Ve Ionix En Acción',
  body: 'Agenda una demostración ejecutiva para entender cómo funciona la orquestación basada en riesgo y cómo se integra a tu operación actual.',
  cta: 'Agendar Demo'
}];
function MarketingCtaTrio() {
  const {
    Badge,
    IconCircle,
    Button
  } = window.IonixDesignSystem_1a028d;
  return /*#__PURE__*/React.createElement("section", {
    style: {
      padding: '96px 48px',
      textAlign: 'center',
      background: 'linear-gradient(180deg, #2b1f2c 0%, var(--bg-page) 100%)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement(Badge, null, "Conversemos")), /*#__PURE__*/React.createElement("h2", {
    className: "type-display-lg",
    style: {
      marginBottom: 12
    }
  }, "Ionix Combina Visi\xF3n Regional Con Arquitectura Enterprise"), /*#__PURE__*/React.createElement("p", {
    className: "type-body-md",
    style: {
      marginBottom: 56
    }
  }, "Estamos construyendo la capa de confianza digital para Latinoam\xE9rica."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 48,
      maxWidth: 1100,
      margin: '0 auto'
    }
  }, items.map(it => /*#__PURE__*/React.createElement("div", {
    key: it.title
  }, /*#__PURE__*/React.createElement(IconCircle, {
    icon: /*#__PURE__*/React.createElement(it.icon, null),
    style: {
      margin: '0 auto 20px'
    }
  }), /*#__PURE__*/React.createElement("h3", {
    className: "type-display-sm",
    style: {
      fontSize: 18,
      marginBottom: 12
    }
  }, it.title), /*#__PURE__*/React.createElement("p", {
    className: "type-body-sm",
    style: {
      marginBottom: 20
    }
  }, it.body), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "sm"
  }, it.cta)))));
}
Object.assign(__ds_scope, { MarketingCtaTrio });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing-site/MarketingCtaTrio.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing-site/MarketingFaq.jsx
try { (() => {
const faqs = [{
  title: '01. ¿Ionix Trust reemplaza a mis proveedores actuales?',
  content: 'No. Ionix Trust potencia tu ecosistema actual. Integramos y gobernamos tus proveedores bajo una lógica unificada de decisión, permitiéndote optimizar resultados sin desmantelar tu infraestructura existente.'
}, {
  title: '02. ¿Qué impacto real puede tener en mi negocio?'
}, {
  title: '03. ¿Es adecuado para entornos regulados?'
}, {
  title: '04. ¿Cuánto tiempo toma implementarlo?'
}, {
  title: '05. ¿Cómo se integra con mi arquitectura actual?'
}, {
  title: '06. ¿Escala para altos volúmenes transaccionales?'
}, {
  title: '07. ¿Cómo se controla el costo transaccional?'
}, {
  title: '08. ¿A qué industrias está dirigido Ionix Trust?'
}, {
  title: '09. ¿Qué soluciones específicas ofrece Ionix Trust?'
}];
function MarketingFaq() {
  const {
    Button,
    Accordion
  } = window.IonixDesignSystem_1a028d;
  return /*#__PURE__*/React.createElement("section", {
    style: {
      padding: '96px 48px',
      maxWidth: 1200,
      margin: '0 auto',
      display: 'grid',
      gridTemplateColumns: '0.8fr 1.2fr',
      gap: 64
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    className: "type-display-lg",
    style: {
      marginBottom: 20
    }
  }, "Lo Que Necesitas Saber Para Operar Con Confianza"), /*#__PURE__*/React.createElement("p", {
    className: "type-body-md",
    style: {
      marginBottom: 28
    }
  }, "Resolvemos las principales inquietudes sobre Ionix Trust, su modelo de orquestaci\xF3n, alcance sectorial y capacidades t\xE9cnicas para operar en entornos regulados de LATAM."), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "sm"
  }, "Cont\xE1ctanos")), /*#__PURE__*/React.createElement(Accordion, {
    icon: "chevron",
    items: faqs
  }));
}
Object.assign(__ds_scope, { MarketingFaq });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing-site/MarketingFaq.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing-site/MarketingFeatureSplit.jsx
try { (() => {
function MarketingFeatureSplit() {
  const {
    Badge,
    Button,
    Card
  } = window.IonixDesignSystem_1a028d;
  return /*#__PURE__*/React.createElement("section", {
    style: {
      padding: '0 48px 96px',
      maxWidth: 1200,
      margin: '0 auto',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 48
    }
  }, /*#__PURE__*/React.createElement(Card, {
    padding: 0,
    style: {
      backgroundImage: 'linear-gradient(rgba(20,16,20,0.55), rgba(20,16,20,0.75)), url(../../assets/photography/editorial-digital-network.jpg)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      padding: 40,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-end',
      minHeight: 420
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement(Badge, null, "Ionix Trust")), /*#__PURE__*/React.createElement("h3", {
    className: "type-display-md",
    style: {
      marginBottom: 16,
      maxWidth: 380
    }
  }, "La Seguridad No Se Suma. Se Orquesta."), /*#__PURE__*/React.createElement("p", {
    className: "type-body-sm",
    style: {
      marginBottom: 16
    }
  }, "Ionix Trust es una plataforma SaaS enterprise dise\xF1ada para:"), /*#__PURE__*/React.createElement("ul", {
    className: "type-body-sm",
    style: {
      margin: '0 0 16px',
      paddingLeft: 18,
      lineHeight: 1.9
    }
  }, /*#__PURE__*/React.createElement("li", null, "Orquestar se\xF1ales y validaciones en tiempo real"), /*#__PURE__*/React.createElement("li", null, "Aplicar fricci\xF3n solo cuando el riesgo lo exige"), /*#__PURE__*/React.createElement("li", null, "Mantener trazabilidad y cumplimiento regulatorio"), /*#__PURE__*/React.createElement("li", null, "Controlar el costo transaccional en mercados de alto volumen")), /*#__PURE__*/React.createElement("h4", {
    className: "type-display-sm",
    style: {
      fontSize: 18,
      marginBottom: 10
    }
  }, "Beneficios Clave"), /*#__PURE__*/React.createElement("ul", {
    className: "type-body-sm",
    style: {
      margin: '0 0 24px',
      paddingLeft: 18,
      lineHeight: 1.9
    }
  }, /*#__PURE__*/React.createElement("li", null, "M\xE1s conversi\xF3n, menos fraude"), /*#__PURE__*/React.createElement("li", null, "Decisiones auditables"), /*#__PURE__*/React.createElement("li", null, "Costos optimizados"), /*#__PURE__*/React.createElement("li", null, "Experiencia sin fricci\xF3n innecesaria")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "sm"
  }, "\xA1Conversemos!"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement(Badge, null, "\xBFPor Qu\xE9 Ionix?")), /*#__PURE__*/React.createElement("h2", {
    className: "type-display-lg",
    style: {
      marginBottom: 4
    }
  }, "Tecnolog\xEDa ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-accent-orange)'
    }
  }, "Global")), /*#__PURE__*/React.createElement("h2", {
    className: "type-display-lg",
    style: {
      marginBottom: 20
    }
  }, "Orquestaci\xF3n ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-accent-orange)'
    }
  }, "Regional")), /*#__PURE__*/React.createElement("p", {
    className: "type-body-md",
    style: {
      marginBottom: 16
    }
  }, "Ionix Trust integra capacidades l\xEDderes del mercado internacional dentro de una arquitectura SaaS gobernada y operada en Latinoam\xE9rica."), /*#__PURE__*/React.createElement("p", {
    className: "type-body-md",
    style: {
      fontWeight: 600,
      color: 'var(--text-primary)',
      marginBottom: 28
    }
  }, "No competimos con los mejores proveedores del mundo.", /*#__PURE__*/React.createElement("br", null), "Los integramos y los gobernamos bajo una sola l\xF3gica de decisi\xF3n."), /*#__PURE__*/React.createElement("h4", {
    className: "type-display-sm",
    style: {
      fontSize: 18,
      marginBottom: 14
    }
  }, "\uD83D\uDDC2 Partners Estrat\xE9gicos"), /*#__PURE__*/React.createElement("ul", {
    className: "type-body-sm",
    style: {
      margin: '0 0 28px',
      paddingLeft: 18,
      lineHeight: 1.9
    }
  }, /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("strong", {
    style: {
      color: 'var(--text-primary)'
    }
  }, "Biometr\xEDa facial y liveness (ISO 30107-3)."), " Aporta evidencia robusta para mitigaci\xF3n de suplantaci\xF3n."), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("strong", {
    style: {
      color: 'var(--text-primary)'
    }
  }, "Huella digital (device + email)"), " y se\xF1ales antifraude tempranas."), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("strong", {
    style: {
      color: 'var(--text-primary)'
    }
  }, "Validaci\xF3n contra fuentes oficiales y registros civiles."), " Cierra el ciclo de identidad con respaldo institucional.")), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "sm"
  }, "Conoce Nuestro Ecosistema")));
}
Object.assign(__ds_scope, { MarketingFeatureSplit });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing-site/MarketingFeatureSplit.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing-site/MarketingFooter.jsx
try { (() => {
const cols = [{
  title: 'Soluciones',
  links: ['Ionix Trust', 'Industrias', 'Nuestros Clientes']
}, {
  title: 'Company',
  links: ['Quiénes Somos', 'Nuestros Partners', 'Contáctanos', 'FAQ', 'Aviso De Privacidad']
}, {
  title: 'Soporte',
  links: ['Formulario De Soporte']
}];
function MarketingFooter() {
  return /*#__PURE__*/React.createElement("footer", {
    style: {
      padding: '80px 48px 32px',
      borderTop: '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1.4fr repeat(3, 1fr)',
      gap: 48,
      maxWidth: 1200,
      margin: '0 auto 64px'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "type-eyebrow",
    style: {
      color: 'var(--text-accent-orange)',
      marginBottom: 16
    }
  }, "Impulsamos Operaciones Seguras En LATAM"), /*#__PURE__*/React.createElement("h2", {
    className: "type-display-lg",
    style: {
      marginBottom: 20
    }
  }, "Conversemos", /*#__PURE__*/React.createElement("br", null), "sobre ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-accent-orange)'
    }
  }, "tu visi\xF3n")), /*#__PURE__*/React.createElement("a", {
    href: "#",
    className: "type-body-md",
    style: {
      color: 'var(--text-primary)',
      fontWeight: 600
    }
  }, "Contacta A Un Experto \u2192")), cols.map(c => /*#__PURE__*/React.createElement("div", {
    key: c.title
  }, /*#__PURE__*/React.createElement("h4", {
    className: "type-display-sm",
    style: {
      fontSize: 16,
      marginBottom: 16
    }
  }, c.title), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, c.links.map(l => /*#__PURE__*/React.createElement("a", {
    key: l,
    href: "#",
    className: "type-body-sm"
  }, l)))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      paddingTop: 24,
      borderTop: '1px solid var(--border-subtle)',
      maxWidth: 1200,
      margin: '0 auto',
      fontSize: 13,
      color: 'var(--text-tertiary)'
    }
  }, /*#__PURE__*/React.createElement("span", null, "Copyright \xA9 2026 Ionix Latam"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 24
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    className: "type-body-sm"
  }, "T\xE9rminos Y Condiciones"), /*#__PURE__*/React.createElement("a", {
    href: "#",
    className: "type-body-sm"
  }, "Pol\xEDtica De Privacidad"))));
}
Object.assign(__ds_scope, { MarketingFooter });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing-site/MarketingFooter.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing-site/MarketingHeader.jsx
try { (() => {
const links = ['Home', '¿Quiénes Somos?', 'Industrias', 'Nuestros Partners', 'FAQs', 'Blog', 'Trabaja con Nosotros'];
function MarketingHeader() {
  const {
    Button
  } = window.IonixDesignSystem_1a028d;
  return /*#__PURE__*/React.createElement("header", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '20px 48px',
      borderBottom: '1px solid var(--border-subtle)',
      background: 'var(--bg-header)',
      position: 'sticky',
      top: 0,
      zIndex: 10
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logos/ionix-logo.png",
    alt: "Ionix",
    style: {
      height: 28
    }
  }), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: 'flex',
      gap: 32,
      fontSize: 15,
      color: 'var(--text-primary)'
    }
  }, links.map(l => /*#__PURE__*/React.createElement("a", {
    key: l,
    href: "#",
    style: {
      opacity: 0.9
    },
    onMouseEnter: e => e.currentTarget.style.opacity = 1,
    onMouseLeave: e => e.currentTarget.style.opacity = 0.9
  }, l))), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "sm"
  }, "Contacto"));
}
Object.assign(__ds_scope, { MarketingHeader });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing-site/MarketingHeader.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing-site/MarketingHero.jsx
try { (() => {
const GridIcon = () => /*#__PURE__*/React.createElement("svg", {
  width: "12",
  height: "12",
  viewBox: "0 0 12 12",
  fill: "currentColor"
}, /*#__PURE__*/React.createElement("circle", {
  cx: "1.5",
  cy: "1.5",
  r: "1.2"
}), /*#__PURE__*/React.createElement("circle", {
  cx: "6",
  cy: "1.5",
  r: "1.2"
}), /*#__PURE__*/React.createElement("circle", {
  cx: "10.5",
  cy: "1.5",
  r: "1.2"
}), /*#__PURE__*/React.createElement("circle", {
  cx: "1.5",
  cy: "6",
  r: "1.2"
}), /*#__PURE__*/React.createElement("circle", {
  cx: "6",
  cy: "6",
  r: "1.2"
}), /*#__PURE__*/React.createElement("circle", {
  cx: "10.5",
  cy: "6",
  r: "1.2"
}), /*#__PURE__*/React.createElement("circle", {
  cx: "1.5",
  cy: "10.5",
  r: "1.2"
}), /*#__PURE__*/React.createElement("circle", {
  cx: "6",
  cy: "10.5",
  r: "1.2"
}), /*#__PURE__*/React.createElement("circle", {
  cx: "10.5",
  cy: "10.5",
  r: "1.2"
}));
function MarketingHero() {
  const {
    Button,
    Badge
  } = window.IonixDesignSystem_1a028d;
  return /*#__PURE__*/React.createElement("section", {
    style: {
      padding: '80px 48px',
      textAlign: 'center',
      background: 'var(--bg-page)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 24
    }
  }, /*#__PURE__*/React.createElement(Badge, null, "Ionix Trust")), /*#__PURE__*/React.createElement("h1", {
    className: "type-display-xl",
    style: {
      fontSize: 56,
      marginBottom: 4
    }
  }, "Orquestando"), /*#__PURE__*/React.createElement("h1", {
    className: "type-display-xl",
    style: {
      fontSize: 56,
      color: 'var(--text-accent-orange)',
      marginBottom: 24
    }
  }, "Control"), /*#__PURE__*/React.createElement("p", {
    className: "type-body-lg",
    style: {
      maxWidth: 640,
      margin: '0 auto 36px'
    }
  }, "Ionix Trust es la plataforma SaaS enterprise que unifica identidad, antifraude y control transaccional para organizaciones que operan procesos cr\xEDticos en mercados regulados de LATAM."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 16,
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary"
  }, "Hablar Con Un Experto"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    icon: /*#__PURE__*/React.createElement(GridIcon, null)
  }, "Conoce M\xE1s")));
}
Object.assign(__ds_scope, { MarketingHero });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing-site/MarketingHero.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing-site/MarketingIndustries.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const BankIcon = p => /*#__PURE__*/React.createElement("svg", _extends({
  width: "20",
  height: "20",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "2"
}, p), /*#__PURE__*/React.createElement("path", {
  d: "M3 10h18M5 10v9M9 10v9M15 10v9M19 10v9M3 21h18M12 3l9 5H3l9-5z",
  strokeLinejoin: "round"
}));
const CartIcon = p => /*#__PURE__*/React.createElement("svg", _extends({
  width: "20",
  height: "20",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "2"
}, p), /*#__PURE__*/React.createElement("circle", {
  cx: "9",
  cy: "21",
  r: "1"
}), /*#__PURE__*/React.createElement("circle", {
  cx: "20",
  cy: "21",
  r: "1"
}), /*#__PURE__*/React.createElement("path", {
  d: "M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6",
  strokeLinecap: "round",
  strokeLinejoin: "round"
}));
const DollarIcon = p => /*#__PURE__*/React.createElement("svg", _extends({
  width: "20",
  height: "20",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "2"
}, p), /*#__PURE__*/React.createElement("path", {
  d: "M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  strokeLinecap: "round",
  strokeLinejoin: "round"
}));
const ShieldIcon = p => /*#__PURE__*/React.createElement("svg", _extends({
  width: "20",
  height: "20",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "2"
}, p), /*#__PURE__*/React.createElement("path", {
  d: "M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z",
  strokeLinecap: "round",
  strokeLinejoin: "round"
}));
const BuildingIcon = p => /*#__PURE__*/React.createElement("svg", _extends({
  width: "20",
  height: "20",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "2"
}, p), /*#__PURE__*/React.createElement("rect", {
  x: "4",
  y: "2",
  width: "16",
  height: "20",
  rx: "1"
}), /*#__PURE__*/React.createElement("path", {
  d: "M9 22v-4h6v4M9 6h1M14 6h1M9 10h1M14 10h1M9 14h1M14 14h1",
  strokeLinecap: "round"
}));
const TelcoIcon = p => /*#__PURE__*/React.createElement("svg", _extends({
  width: "20",
  height: "20",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "2"
}, p), /*#__PURE__*/React.createElement("path", {
  d: "M2 12a10 10 0 0 1 10-10M2 12a5 5 0 0 1 5-5M2 12a1.5 1.5 0 0 1 1.5-1.5M17.5 12a5.5 5.5 0 0 0-5.5-5.5",
  strokeLinecap: "round"
}), /*#__PURE__*/React.createElement("circle", {
  cx: "18",
  cy: "16",
  r: "3"
}));
const industries = [{
  icon: DollarIcon,
  name: 'Fintech Y Servicios Financieros',
  headline: 'Más conversión. Menos fraude. Costo bajo control en mercados de alta presión regulatoria.',
  context: 'Las fintech en Latinoamérica enfrentan fraude sofisticado, competencia intensa y necesidad de escalar rápidamente sin comprometer cumplimiento.'
}, {
  icon: BankIcon,
  name: 'Banca',
  headline: 'Control, trazabilidad y cumplimiento para la banca latinoamericana',
  context: 'La banca opera bajo marcos regulatorios estrictos y altos estándares de auditoría.'
}, {
  icon: CartIcon,
  name: 'Retail & E-Commerce',
  headline: 'Protege ventas sin bloquear clientes potenciales',
  context: 'El comercio electrónico regional enfrenta fraude transfronterizo y presión por experiencia fluida.'
}, {
  icon: BuildingIcon,
  name: 'Seguros',
  headline: 'Menos Fraude En Siniestros. Más Trazabilidad Institucional.',
  context: 'Procesos manuales y fraude estructurado afectan rentabilidad.'
}, {
  icon: ShieldIcon,
  name: 'Gobierno Y Sector Público',
  headline: 'Identidad Confiable Para Procesos Críticos Del Estado',
  context: 'Subsidios y beneficios requieren validación robusta en entornos legacy.'
}, {
  icon: TelcoIcon,
  name: 'Telcos',
  headline: 'Identidad Fuerte A Escala Regional',
  context: 'SIM swap y suplantación impactan operaciones de alto volumen en múltiples países.'
}];
function MarketingIndustries() {
  const {
    Badge,
    Card,
    IconCircle,
    Accordion,
    Button
  } = window.IonixDesignSystem_1a028d;
  return /*#__PURE__*/React.createElement("section", {
    style: {
      padding: '96px 48px',
      background: 'var(--bg-surface-sunken)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      maxWidth: 640,
      margin: '0 auto 56px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement(Badge, null, "Industrias")), /*#__PURE__*/React.createElement("h2", {
    className: "type-display-lg",
    style: {
      marginBottom: 16
    }
  }, "C\xF3mo Trabaja Ionix Trust En Cada Industria"), /*#__PURE__*/React.createElement("p", {
    className: "type-body-md"
  }, "Cada industria enfrenta riesgos, regulaciones y din\xE1micas operativas distintas. Ionix Trust se adapta a esos contextos mediante casos de uso espec\xEDficos que combinan identidad, se\xF1ales antifraude y decisiones basadas en riesgo dentro de flujos dise\xF1ados para cada operaci\xF3n.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 24,
      maxWidth: 1200,
      margin: '0 auto'
    }
  }, industries.map(ind => /*#__PURE__*/React.createElement(Card, {
    key: ind.name
  }, /*#__PURE__*/React.createElement(IconCircle, {
    shape: "square",
    size: "sm",
    icon: /*#__PURE__*/React.createElement(ind.icon, null),
    style: {
      marginBottom: 20
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "type-body-sm",
    style: {
      color: 'var(--text-secondary)',
      marginBottom: 10
    }
  }, ind.name), /*#__PURE__*/React.createElement("h3", {
    className: "type-display-sm",
    style: {
      fontSize: 18,
      marginBottom: 20
    }
  }, ind.headline), /*#__PURE__*/React.createElement(Accordion, {
    icon: "plus",
    defaultOpenIndex: -1,
    items: [{
      title: 'Contexto Regional',
      content: ind.context
    }, {
      title: 'Solución',
      content: 'Orquestación de señales de identidad y antifraude adaptadas al flujo operativo del sector.'
    }, {
      title: 'Impacto',
      content: 'Mayor control, menor fraude y cumplimiento auditable en cada transacción.'
    }]
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      marginTop: 40
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "secondary"
  }, "Fortalece Tus Procesos Cr\xEDticos")));
}
Object.assign(__ds_scope, { MarketingIndustries });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing-site/MarketingIndustries.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing-site/MarketingLeadForm.jsx
try { (() => {
const {
  useState
} = React;
function MarketingLeadForm() {
  const {
    Badge,
    Input,
    Select,
    Textarea,
    Button
  } = window.IonixDesignSystem_1a028d;
  const [sent, setSent] = useState(false);
  return /*#__PURE__*/React.createElement("section", {
    style: {
      padding: '96px 48px',
      background: 'var(--gradient-brand-diagonal)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 560,
      margin: '0 auto',
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("h2", {
    className: "type-display-lg",
    style: {
      marginBottom: 12
    }
  }, "Eval\xFAa Tu Operaci\xF3n Con Ionix"), /*#__PURE__*/React.createElement("p", {
    className: "type-body-md",
    style: {
      color: 'rgba(255,255,255,0.85)',
      marginBottom: 32
    }
  }, "Analicemos juntos c\xF3mo equilibrar seguridad, experiencia y costo en tu operaci\xF3n digital. Completa el formulario y uno de nuestros especialistas te contactar\xE1."), sent ? /*#__PURE__*/React.createElement("p", {
    className: "type-body-md",
    style: {
      color: '#fff'
    }
  }, "\xA1Gracias! Te contactaremos pronto.") : /*#__PURE__*/React.createElement("form", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 18,
      textAlign: 'left'
    },
    onSubmit: e => {
      e.preventDefault();
      setSent(true);
    }
  }, /*#__PURE__*/React.createElement(Input, {
    label: "Tu nombre"
  }), /*#__PURE__*/React.createElement(Input, {
    label: "Tu correo electr\xF3nico",
    type: "email"
  }), /*#__PURE__*/React.createElement(Input, {
    label: "Tu tel\xE9fono",
    type: "tel"
  }), /*#__PURE__*/React.createElement(Select, {
    label: "\xBFDe d\xF3nde nos visitas?",
    value: "Chile",
    options: ['Chile', 'México', 'Colombia', 'Perú', 'Otro'],
    onChange: () => {}
  }), /*#__PURE__*/React.createElement(Textarea, {
    label: "Tu mensaje (opcional)",
    rows: 4
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "sm"
  }, "Enviar"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 24,
      justifyContent: 'center',
      marginTop: 28,
      fontSize: 14,
      color: 'rgba(255,255,255,0.85)'
    }
  }, /*#__PURE__*/React.createElement("span", null, "\u2713 Orquestaci\xF3n de soluciones"), /*#__PURE__*/React.createElement("span", null, "\u2713 Seguridad Transaccional")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 20
    }
  }, /*#__PURE__*/React.createElement(Badge, null, "Ionix En Tu Industria"))));
}
Object.assign(__ds_scope, { MarketingLeadForm });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing-site/MarketingLeadForm.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing-site/MarketingTrustStats.jsx
try { (() => {
const stats = [{
  value: '+15',
  label: 'Años De Experiencia'
}, {
  value: '+400',
  label: 'Millones De Transacciones'
}, {
  value: '+15',
  label: 'Clientes Enterprise'
}, {
  value: '+3',
  label: 'Países En LATAM'
}];
function MarketingTrustStats() {
  const {
    StatBlock
  } = window.IonixDesignSystem_1a028d;
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: 'var(--gradient-brand)',
      padding: '32px 48px',
      display: 'flex',
      justifyContent: 'center',
      gap: 64,
      flexWrap: 'wrap'
    }
  }, stats.map((s, i) => /*#__PURE__*/React.createElement(StatBlock, {
    key: i,
    value: s.value,
    label: s.label
  })));
}
Object.assign(__ds_scope, { MarketingTrustStats });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing-site/MarketingTrustStats.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Card = __ds_scope.Card;

__ds_ns.IconCircle = __ds_scope.IconCircle;

__ds_ns.StatBlock = __ds_scope.StatBlock;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Textarea = __ds_scope.Textarea;

__ds_ns.Accordion = __ds_scope.Accordion;

__ds_ns.MarketingAbout = __ds_scope.MarketingAbout;

__ds_ns.MarketingBlog = __ds_scope.MarketingBlog;

__ds_ns.MarketingClients = __ds_scope.MarketingClients;

__ds_ns.MarketingCtaTrio = __ds_scope.MarketingCtaTrio;

__ds_ns.MarketingFaq = __ds_scope.MarketingFaq;

__ds_ns.MarketingFeatureSplit = __ds_scope.MarketingFeatureSplit;

__ds_ns.MarketingFooter = __ds_scope.MarketingFooter;

__ds_ns.MarketingHeader = __ds_scope.MarketingHeader;

__ds_ns.MarketingHero = __ds_scope.MarketingHero;

__ds_ns.MarketingIndustries = __ds_scope.MarketingIndustries;

__ds_ns.MarketingLeadForm = __ds_scope.MarketingLeadForm;

__ds_ns.MarketingTrustStats = __ds_scope.MarketingTrustStats;

})();
