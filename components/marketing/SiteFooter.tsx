/**
 * Footer-Komponente, die 1:1 die Homepage-Footer (public/index.html)
 * spiegelt. Nutzt die gleichen CSS-Klassen aus public/css/style.css.
 */
export default function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="container">
          <div className="footer-top">
            <a href="/" className="footer-logo">
              <img
                src="/images/Mit Schrift Weiß Lang.png"
                alt="Kolac Digital"
                width={500}
                height={284}
              />
            </a>
            <div className="footer-columns">
              <div className="footer-col">
                <span className="footer-col-title">Links</span>
                <a href="/#leistungen">Leistungen</a>
                <a href="/#about">Über uns</a>
                <a href="/case-studys">Case Studys</a>
                <a href="/portfolio">Portfolio</a>
                <a href="/#kundenstimmen">Kundenstimmen</a>
                <a href="/#kontakt">Kontakt</a>
              </div>
              <div className="footer-col">
                <span className="footer-col-title">Rechtliches</span>
                <a href="/impressum.html">Impressum</a>
                <a href="/datenschutz.html">Datenschutz</a>
                <a href="/agb.html">AGB</a>
              </div>
            </div>
          </div>
          <p className="footer-copy">
            © 2019–{year} Kolac Digital · Beckhausstraße 108, 33611 Bielefeld ·
            Alle Rechte vorbehalten.
          </p>
        </div>
      </div>
    </footer>
  );
}
