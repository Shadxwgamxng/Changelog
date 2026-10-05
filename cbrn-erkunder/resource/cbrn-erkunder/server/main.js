var __dirname = (typeof GetResourcePath === 'function' ? GetResourcePath(GetCurrentResourceName()) : process.cwd()) + '/server'; var __filename = __dirname + '/main.js';
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/sql.js/dist/sql-wasm.js
var require_sql_wasm = __commonJS({
  "node_modules/sql.js/dist/sql-wasm.js"(exports2, module2) {
    var initSqlJsPromise = void 0;
    var initSqlJs2 = function(moduleConfig) {
      if (initSqlJsPromise) {
        return initSqlJsPromise;
      }
      initSqlJsPromise = new Promise(function(resolveModule, reject) {
        var _a, _b, _c, _d, _e;
        var Module = typeof moduleConfig !== "undefined" ? moduleConfig : {};
        var originalOnAbortFunction = Module["onAbort"];
        Module["onAbort"] = function(errorThatCausedAbort) {
          reject(new Error(errorThatCausedAbort));
          if (originalOnAbortFunction) {
            originalOnAbortFunction(errorThatCausedAbort);
          }
        };
        Module["postRun"] = Module["postRun"] || [];
        Module["postRun"].push(function() {
          resolveModule(Module);
        });
        module2 = void 0;
        var k;
        k ||= typeof Module != "undefined" ? Module : {};
        var aa = !!globalThis.window, ba = !!globalThis.WorkerGlobalScope, ca = ((_b = (_a = globalThis.process) == null ? void 0 : _a.versions) == null ? void 0 : _b.node) && "renderer" != ((_c = globalThis.process) == null ? void 0 : _c.type);
        k.onRuntimeInitialized = function() {
          function a(f, l) {
            switch (typeof l) {
              case "boolean":
                dc(f, l ? 1 : 0);
                break;
              case "number":
                ec(f, l);
                break;
              case "string":
                fc(f, l, -1, -1);
                break;
              case "object":
                if (null === l) lb(f);
                else if (null != l.length) {
                  var n = da(l.length);
                  m.set(l, n);
                  gc(f, n, l.length, -1);
                  ea(n);
                } else va(f, "Wrong API use : tried to return a value of an unknown type (" + l + ").", -1);
                break;
              default:
                lb(f);
            }
          }
          function b(f, l) {
            for (var n = [], p = 0; p < f; p += 1) {
              var r = t(l + 4 * p, "i32"), w = hc(r);
              if (1 === w || 2 === w) r = ic(r);
              else if (3 === w) r = jc(r);
              else if (4 === w) {
                w = r;
                r = kc(w);
                w = lc(w);
                for (var J = new Uint8Array(r), I = 0; I < r; I += 1) J[I] = m[w + I];
                r = J;
              } else r = null;
              n.push(r);
            }
            return n;
          }
          function c(f, l) {
            this.Qa = f;
            this.db = l;
            this.Oa = 1;
            this.mb = [];
          }
          function d(f, l) {
            this.db = l;
            this.fb = fa(f);
            if (null === this.fb) throw Error("Unable to allocate memory for the SQL string");
            this.lb = this.fb;
            this.$a = this.sb = null;
          }
          function e(f) {
            this.filename = "dbfile_" + (4294967295 * Math.random() >>> 0);
            if (null != f) {
              var l = this.filename, n = "/", p = l;
              n && (n = "string" == typeof n ? n : ha(n), p = l ? ia(n + "/" + l) : n);
              l = ja(true, true);
              p = ka(
                p,
                l
              );
              if (f) {
                if ("string" == typeof f) {
                  n = Array(f.length);
                  for (var r = 0, w = f.length; r < w; ++r) n[r] = f.charCodeAt(r);
                  f = n;
                }
                ma(p, l | 146);
                n = na(p, 577);
                oa(n, f, 0, f.length, 0);
                pa(n);
                ma(p, l);
              }
            }
            this.handleError(q(this.filename, g));
            this.db = t(g, "i32");
            ob(this.db);
            this.gb = {};
            this.Sa = {};
          }
          var g = y(4), h = k.cwrap, q = h("sqlite3_open", "number", ["string", "number"]), v = h("sqlite3_close_v2", "number", ["number"]), u = h("sqlite3_exec", "number", ["number", "string", "number", "number", "number"]), x = h("sqlite3_changes", "number", ["number"]), D = h(
            "sqlite3_prepare_v2",
            "number",
            ["number", "string", "number", "number", "number"]
          ), pb = h("sqlite3_sql", "string", ["number"]), nc = h("sqlite3_normalized_sql", "string", ["number"]), qb = h("sqlite3_prepare_v2", "number", ["number", "number", "number", "number", "number"]), oc = h("sqlite3_bind_text", "number", ["number", "number", "number", "number", "number"]), rb = h("sqlite3_bind_blob", "number", ["number", "number", "number", "number", "number"]), pc = h("sqlite3_bind_double", "number", ["number", "number", "number"]), qc = h("sqlite3_bind_int", "number", [
            "number",
            "number",
            "number"
          ]), rc = h("sqlite3_bind_parameter_index", "number", ["number", "string"]), sc = h("sqlite3_step", "number", ["number"]), tc = h("sqlite3_errmsg", "string", ["number"]), uc = h("sqlite3_column_count", "number", ["number"]), vc = h("sqlite3_data_count", "number", ["number"]), wc = h("sqlite3_column_double", "number", ["number", "number"]), sb = h("sqlite3_column_text", "string", ["number", "number"]), xc = h("sqlite3_column_blob", "number", ["number", "number"]), yc = h("sqlite3_column_bytes", "number", ["number", "number"]), zc = h(
            "sqlite3_column_type",
            "number",
            ["number", "number"]
          ), Ac = h("sqlite3_column_name", "string", ["number", "number"]), Bc = h("sqlite3_reset", "number", ["number"]), Cc = h("sqlite3_clear_bindings", "number", ["number"]), Dc = h("sqlite3_finalize", "number", ["number"]), tb = h("sqlite3_create_function_v2", "number", "number string number number number number number number number".split(" ")), hc = h("sqlite3_value_type", "number", ["number"]), kc = h("sqlite3_value_bytes", "number", ["number"]), jc = h("sqlite3_value_text", "string", ["number"]), lc = h(
            "sqlite3_value_blob",
            "number",
            ["number"]
          ), ic = h("sqlite3_value_double", "number", ["number"]), ec = h("sqlite3_result_double", "", ["number", "number"]), lb = h("sqlite3_result_null", "", ["number"]), fc = h("sqlite3_result_text", "", ["number", "string", "number", "number"]), gc = h("sqlite3_result_blob", "", ["number", "number", "number", "number"]), dc = h("sqlite3_result_int", "", ["number", "number"]), va = h("sqlite3_result_error", "", ["number", "string", "number"]), ub = h("sqlite3_aggregate_context", "number", ["number", "number"]), ob = h(
            "RegisterExtensionFunctions",
            "number",
            ["number"]
          ), vb = h("sqlite3_update_hook", "number", ["number", "number", "number"]);
          c.prototype.bind = function(f) {
            if (!this.Qa) throw "Statement closed";
            this.reset();
            return Array.isArray(f) ? this.Gb(f) : null != f && "object" === typeof f ? this.Hb(f) : true;
          };
          c.prototype.step = function() {
            if (!this.Qa) throw "Statement closed";
            this.Oa = 1;
            var f = sc(this.Qa);
            switch (f) {
              case 100:
                return true;
              case 101:
                return false;
              default:
                throw this.db.handleError(f);
            }
          };
          c.prototype.Ab = function(f) {
            null == f && (f = this.Oa, this.Oa += 1);
            return wc(this.Qa, f);
          };
          c.prototype.Ob = function(f) {
            null == f && (f = this.Oa, this.Oa += 1);
            f = sb(this.Qa, f);
            if ("function" !== typeof BigInt) throw Error("BigInt is not supported");
            return BigInt(f);
          };
          c.prototype.Tb = function(f) {
            null == f && (f = this.Oa, this.Oa += 1);
            return sb(this.Qa, f);
          };
          c.prototype.getBlob = function(f) {
            null == f && (f = this.Oa, this.Oa += 1);
            var l = yc(this.Qa, f);
            f = xc(this.Qa, f);
            for (var n = new Uint8Array(l), p = 0; p < l; p += 1) n[p] = m[f + p];
            return n;
          };
          c.prototype.get = function(f, l) {
            l = l || {};
            null != f && this.bind(f) && this.step();
            f = [];
            for (var n = vc(this.Qa), p = 0; p < n; p += 1) switch (zc(this.Qa, p)) {
              case 1:
                var r = l.useBigInt ? this.Ob(p) : this.Ab(p);
                f.push(r);
                break;
              case 2:
                f.push(this.Ab(p));
                break;
              case 3:
                f.push(this.Tb(p));
                break;
              case 4:
                f.push(this.getBlob(p));
                break;
              default:
                f.push(null);
            }
            return f;
          };
          c.prototype.qb = function() {
            for (var f = [], l = uc(this.Qa), n = 0; n < l; n += 1) f.push(Ac(this.Qa, n));
            return f;
          };
          c.prototype.zb = function(f, l) {
            f = this.get(f, l);
            l = this.qb();
            for (var n = {}, p = 0; p < l.length; p += 1) n[l[p]] = f[p];
            return n;
          };
          c.prototype.Sb = function() {
            return pb(this.Qa);
          };
          c.prototype.Pb = function() {
            return nc(this.Qa);
          };
          c.prototype.run = function(f) {
            null != f && this.bind(f);
            this.step();
            return this.reset();
          };
          c.prototype.wb = function(f, l) {
            null == l && (l = this.Oa, this.Oa += 1);
            f = fa(f);
            this.mb.push(f);
            this.db.handleError(oc(this.Qa, l, f, -1, 0));
          };
          c.prototype.Fb = function(f, l) {
            null == l && (l = this.Oa, this.Oa += 1);
            var n = da(f.length);
            m.set(f, n);
            this.mb.push(n);
            this.db.handleError(rb(this.Qa, l, n, f.length, 0));
          };
          c.prototype.vb = function(f, l) {
            null == l && (l = this.Oa, this.Oa += 1);
            this.db.handleError((f === (f | 0) ? qc : pc)(
              this.Qa,
              l,
              f
            ));
          };
          c.prototype.Ib = function(f) {
            null == f && (f = this.Oa, this.Oa += 1);
            rb(this.Qa, f, 0, 0, 0);
          };
          c.prototype.xb = function(f, l) {
            null == l && (l = this.Oa, this.Oa += 1);
            switch (typeof f) {
              case "string":
                this.wb(f, l);
                return;
              case "number":
                this.vb(f, l);
                return;
              case "bigint":
                this.wb(f.toString(), l);
                return;
              case "boolean":
                this.vb(f + 0, l);
                return;
              case "object":
                if (null === f) {
                  this.Ib(l);
                  return;
                }
                if (null != f.length) {
                  this.Fb(f, l);
                  return;
                }
            }
            throw "Wrong API use : tried to bind a value of an unknown type (" + f + ").";
          };
          c.prototype.Hb = function(f) {
            var l = this;
            Object.keys(f).forEach(function(n) {
              var p = rc(l.Qa, n);
              0 !== p && l.xb(f[n], p);
            });
            return true;
          };
          c.prototype.Gb = function(f) {
            for (var l = 0; l < f.length; l += 1) this.xb(f[l], l + 1);
            return true;
          };
          c.prototype.reset = function() {
            this.freemem();
            return 0 === Cc(this.Qa) && 0 === Bc(this.Qa);
          };
          c.prototype.freemem = function() {
            for (var f; void 0 !== (f = this.mb.pop()); ) ea(f);
          };
          c.prototype.Ya = function() {
            this.freemem();
            var f = 0 === Dc(this.Qa);
            delete this.db.gb[this.Qa];
            this.Qa = 0;
            return f;
          };
          d.prototype.next = function() {
            if (null === this.fb) return { done: true };
            null !== this.$a && (this.$a.Ya(), this.$a = null);
            if (!this.db.db) throw this.ob(), Error("Database closed");
            var f = qa(), l = y(4);
            ra(g);
            ra(l);
            try {
              this.db.handleError(qb(this.db.db, this.lb, -1, g, l));
              this.lb = t(l, "i32");
              var n = t(g, "i32");
              if (0 === n) return this.ob(), { done: true };
              this.$a = new c(n, this.db);
              this.db.gb[n] = this.$a;
              return { value: this.$a, done: false };
            } catch (p) {
              throw this.sb = z(this.lb), this.ob(), p;
            } finally {
              sa(f);
            }
          };
          d.prototype.ob = function() {
            ea(this.fb);
            this.fb = null;
          };
          d.prototype.Qb = function() {
            return null !== this.sb ? this.sb : z(this.lb);
          };
          "function" === typeof Symbol && "symbol" === typeof Symbol.iterator && (d.prototype[Symbol.iterator] = function() {
            return this;
          });
          e.prototype.run = function(f, l) {
            if (!this.db) throw "Database closed";
            if (l) {
              f = this.tb(f, l);
              try {
                f.step();
              } finally {
                f.Ya();
              }
            } else this.handleError(u(this.db, f, 0, 0, g));
            return this;
          };
          e.prototype.exec = function(f, l, n) {
            if (!this.db) throw "Database closed";
            var p = qa(), r = null, w = null, J = null;
            try {
              J = w = fa(f);
              var I = y(4);
              for (f = []; 0 !== t(J, "i8"); ) {
                ra(g);
                ra(I);
                this.handleError(qb(this.db, J, -1, g, I));
                var L3 = t(g, "i32");
                J = t(I, "i32");
                if (0 !== L3) {
                  var G3 = null;
                  r = new c(L3, this);
                  for (null != l && r.bind(l); r.step(); ) null === G3 && (G3 = { columns: r.qb(), values: [] }, f.push(G3)), G3.values.push(r.get(null, n));
                  r.Ya();
                }
              }
              return f;
            } catch (la) {
              throw r && r.Ya(), la;
            } finally {
              w && ea(w), sa(p);
            }
          };
          e.prototype.Mb = function(f, l, n, p, r) {
            "function" === typeof l && (p = n, n = l, l = void 0);
            f = this.tb(f, l);
            try {
              for (; f.step(); ) n(f.zb(null, r));
            } finally {
              f.Ya();
            }
            if ("function" === typeof p) return p();
          };
          e.prototype.tb = function(f, l) {
            ra(g);
            this.handleError(D(this.db, f, -1, g, 0));
            f = t(g, "i32");
            if (0 === f) throw "Nothing to prepare";
            var n = new c(f, this);
            null != l && n.bind(l);
            return this.gb[f] = n;
          };
          e.prototype.Ub = function(f) {
            return new d(f, this);
          };
          e.prototype.Nb = function() {
            Object.values(this.gb).forEach(function(l) {
              l.Ya();
            });
            Object.values(this.Sa).forEach(A);
            this.Sa = {};
            this.handleError(v(this.db));
            var f = ta(this.filename);
            this.handleError(q(this.filename, g));
            this.db = t(g, "i32");
            ob(this.db);
            return f;
          };
          e.prototype.close = function() {
            null !== this.db && (Object.values(this.gb).forEach(function(f) {
              f.Ya();
            }), Object.values(this.Sa).forEach(A), this.Sa = {}, this.Za && (A(this.Za), this.Za = void 0), this.handleError(v(this.db)), ua("/" + this.filename), this.db = null);
          };
          e.prototype.handleError = function(f) {
            if (0 === f) return null;
            f = tc(this.db);
            throw Error(f);
          };
          e.prototype.Rb = function() {
            return x(this.db);
          };
          e.prototype.Kb = function(f, l) {
            Object.prototype.hasOwnProperty.call(this.Sa, f) && (A(this.Sa[f]), delete this.Sa[f]);
            var n = wa(function(p, r, w) {
              r = b(r, w);
              try {
                var J = l.apply(null, r);
              } catch (I) {
                va(p, I, -1);
                return;
              }
              a(p, J);
            }, "viii");
            this.Sa[f] = n;
            this.handleError(tb(this.db, f, l.length, 1, 0, n, 0, 0, 0));
            return this;
          };
          e.prototype.Jb = function(f, l) {
            var n = l.init || function() {
              return null;
            }, p = l.finalize || function(L3) {
              return L3;
            }, r = l.step;
            if (!r) throw "An aggregate function must have a step function in " + f;
            var w = {};
            Object.hasOwnProperty.call(this.Sa, f) && (A(this.Sa[f]), delete this.Sa[f]);
            l = f + "__finalize";
            Object.hasOwnProperty.call(this.Sa, l) && (A(this.Sa[l]), delete this.Sa[l]);
            var J = wa(function(L3, G3, la) {
              var V = ub(L3, 1);
              Object.hasOwnProperty.call(w, V) || (w[V] = n());
              G3 = b(G3, la);
              G3 = [w[V]].concat(G3);
              try {
                w[V] = r.apply(null, G3);
              } catch (Fc) {
                delete w[V], va(L3, Fc, -1);
              }
            }, "viii"), I = wa(function(L3) {
              var G3 = ub(L3, 1);
              try {
                var la = p(w[G3]);
              } catch (V) {
                delete w[G3];
                va(L3, V, -1);
                return;
              }
              a(L3, la);
              delete w[G3];
            }, "vi");
            this.Sa[f] = J;
            this.Sa[l] = I;
            this.handleError(tb(this.db, f, r.length - 1, 1, 0, 0, J, I, 0));
            return this;
          };
          e.prototype.Zb = function(f) {
            this.Za && (vb(this.db, 0, 0), A(this.Za), this.Za = void 0);
            if (!f) return this;
            this.Za = wa(function(l, n, p, r, w) {
              switch (n) {
                case 18:
                  l = "insert";
                  break;
                case 23:
                  l = "update";
                  break;
                case 9:
                  l = "delete";
                  break;
                default:
                  throw "unknown operationCode in updateHook callback: " + n;
              }
              p = z(p);
              r = z(r);
              if (w > Number.MAX_SAFE_INTEGER) throw "rowId too big to fit inside a Number";
              f(l, p, r, Number(w));
            }, "viiiij");
            vb(this.db, this.Za, 0);
            return this;
          };
          c.prototype.bind = c.prototype.bind;
          c.prototype.step = c.prototype.step;
          c.prototype.get = c.prototype.get;
          c.prototype.getColumnNames = c.prototype.qb;
          c.prototype.getAsObject = c.prototype.zb;
          c.prototype.getSQL = c.prototype.Sb;
          c.prototype.getNormalizedSQL = c.prototype.Pb;
          c.prototype.run = c.prototype.run;
          c.prototype.reset = c.prototype.reset;
          c.prototype.freemem = c.prototype.freemem;
          c.prototype.free = c.prototype.Ya;
          d.prototype.next = d.prototype.next;
          d.prototype.getRemainingSQL = d.prototype.Qb;
          e.prototype.run = e.prototype.run;
          e.prototype.exec = e.prototype.exec;
          e.prototype.each = e.prototype.Mb;
          e.prototype.prepare = e.prototype.tb;
          e.prototype.iterateStatements = e.prototype.Ub;
          e.prototype["export"] = e.prototype.Nb;
          e.prototype.close = e.prototype.close;
          e.prototype.handleError = e.prototype.handleError;
          e.prototype.getRowsModified = e.prototype.Rb;
          e.prototype.create_function = e.prototype.Kb;
          e.prototype.create_aggregate = e.prototype.Jb;
          e.prototype.updateHook = e.prototype.Zb;
          k.Database = e;
        };
        var xa = "./this.program", ya = (a, b) => {
          throw b;
        }, za = (_e = (_d = globalThis.document) == null ? void 0 : _d.currentScript) == null ? void 0 : _e.src;
        "undefined" != typeof __filename ? za = __filename : ba && (za = self.location.href);
        var Aa = "", Ba, Ca;
        if (ca) {
          var fs3 = require("node:fs");
          Aa = __dirname + "/";
          Ca = (a) => {
            a = Da(a) ? new URL(a) : a;
            return fs3.readFileSync(a);
          };
          Ba = async (a) => {
            a = Da(a) ? new URL(a) : a;
            return fs3.readFileSync(a, void 0);
          };
          1 < process.argv.length && (xa = process.argv[1].replace(/\\/g, "/"));
          process.argv.slice(2);
          "undefined" != typeof module2 && (module2.exports = k);
          ya = (a, b) => {
            process.exitCode = a;
            throw b;
          };
        } else if (aa || ba) {
          try {
            Aa = new URL(".", za).href;
          } catch {
          }
          ba && (Ca = (a) => {
            var b = new XMLHttpRequest();
            b.open("GET", a, false);
            b.responseType = "arraybuffer";
            b.send(null);
            return new Uint8Array(b.response);
          });
          Ba = async (a) => {
            if (Da(a)) return new Promise((c, d) => {
              var e = new XMLHttpRequest();
              e.open("GET", a, true);
              e.responseType = "arraybuffer";
              e.onload = () => {
                200 == e.status || 0 == e.status && e.response ? c(e.response) : d(e.status);
              };
              e.onerror = d;
              e.send(null);
            });
            var b = await fetch(a, { credentials: "same-origin" });
            if (b.ok) return b.arrayBuffer();
            throw Error(b.status + " : " + b.url);
          };
        }
        var Ea = console.log.bind(console), B = console.error.bind(console), Fa, Ga = false, Ha, Da = (a) => a.startsWith("file://"), m, C, Ia, E, F, Ja, Ka, H;
        function La() {
          var a = Ma.buffer;
          m = new Int8Array(a);
          Ia = new Int16Array(a);
          C = new Uint8Array(a);
          new Uint16Array(a);
          E = new Int32Array(a);
          F = new Uint32Array(a);
          Ja = new Float32Array(a);
          Ka = new Float64Array(a);
          H = new BigInt64Array(a);
          new BigUint64Array(a);
        }
        function Na(a) {
          var _a2;
          (_a2 = k.onAbort) == null ? void 0 : _a2.call(k, a);
          a = "Aborted(" + a + ")";
          B(a);
          Ga = true;
          throw new WebAssembly.RuntimeError(a + ". Build with -sASSERTIONS for more info.");
        }
        var Oa;
        async function Pa(a) {
          if (!Fa) try {
            var b = await Ba(a);
            return new Uint8Array(b);
          } catch {
          }
          if (a == Oa && Fa) a = new Uint8Array(Fa);
          else if (Ca) a = Ca(a);
          else throw "both async and sync fetching of the wasm failed";
          return a;
        }
        async function Qa(a, b) {
          try {
            var c = await Pa(a);
            return await WebAssembly.instantiate(c, b);
          } catch (d) {
            B(`failed to asynchronously prepare wasm: ${d}`), Na(d);
          }
        }
        async function Ra(a) {
          var b = Oa;
          if (!Fa && !Da(b) && !ca) try {
            var c = fetch(b, { credentials: "same-origin" });
            return await WebAssembly.instantiateStreaming(c, a);
          } catch (d) {
            B(`wasm streaming compile failed: ${d}`), B("falling back to ArrayBuffer instantiation");
          }
          return Qa(b, a);
        }
        class Sa {
          name = "ExitStatus";
          constructor(a) {
            this.message = `Program terminated with exit(${a})`;
            this.status = a;
          }
        }
        var Ta = (a) => {
          for (; 0 < a.length; ) a.shift()(k);
        }, Ua = [], Va = [], Wa = () => {
          var a = k.preRun.shift();
          Va.push(a);
        }, K = 0, Xa = null;
        function t(a, b = "i8") {
          b.endsWith("*") && (b = "*");
          switch (b) {
            case "i1":
              return m[a];
            case "i8":
              return m[a];
            case "i16":
              return Ia[a >> 1];
            case "i32":
              return E[a >> 2];
            case "i64":
              return H[a >> 3];
            case "float":
              return Ja[a >> 2];
            case "double":
              return Ka[a >> 3];
            case "*":
              return F[a >> 2];
            default:
              Na(`invalid type for getValue: ${b}`);
          }
        }
        var Ya = true;
        function ra(a) {
          var b = "i32";
          b.endsWith("*") && (b = "*");
          switch (b) {
            case "i1":
              m[a] = 0;
              break;
            case "i8":
              m[a] = 0;
              break;
            case "i16":
              Ia[a >> 1] = 0;
              break;
            case "i32":
              E[a >> 2] = 0;
              break;
            case "i64":
              H[a >> 3] = BigInt(0);
              break;
            case "float":
              Ja[a >> 2] = 0;
              break;
            case "double":
              Ka[a >> 3] = 0;
              break;
            case "*":
              F[a >> 2] = 0;
              break;
            default:
              Na(`invalid type for setValue: ${b}`);
          }
        }
        var Za = new TextDecoder(), $a = (a, b, c, d) => {
          c = b + c;
          if (d) return c;
          for (; a[b] && !(b >= c); ) ++b;
          return b;
        }, z = (a, b, c) => a ? Za.decode(C.subarray(a, $a(C, a, b, c))) : "", ab = (a, b) => {
          for (var c = 0, d = a.length - 1; 0 <= d; d--) {
            var e = a[d];
            "." === e ? a.splice(d, 1) : ".." === e ? (a.splice(d, 1), c++) : c && (a.splice(d, 1), c--);
          }
          if (b) for (; c; c--) a.unshift("..");
          return a;
        }, ia = (a) => {
          var b = "/" === a.charAt(0), c = "/" === a.slice(-1);
          (a = ab(a.split("/").filter((d) => !!d), !b).join("/")) || b || (a = ".");
          a && c && (a += "/");
          return (b ? "/" : "") + a;
        }, bb = (a) => {
          var b = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/.exec(a).slice(1);
          a = b[0];
          b = b[1];
          if (!a && !b) return ".";
          b &&= b.slice(0, -1);
          return a + b;
        }, cb = (a) => a && a.match(/([^\/]+|\/)\/*$/)[1], db2 = () => {
          if (ca) {
            var a = require("node:crypto");
            return (b) => a.randomFillSync(b);
          }
          return (b) => crypto.getRandomValues(b);
        }, eb = (a) => {
          (eb = db2())(a);
        }, fb = (...a) => {
          for (var b = "", c = false, d = a.length - 1; -1 <= d && !c; d--) {
            c = 0 <= d ? a[d] : "/";
            if ("string" != typeof c) throw new TypeError("Arguments to path.resolve must be strings");
            if (!c) return "";
            b = c + "/" + b;
            c = "/" === c.charAt(0);
          }
          b = ab(b.split("/").filter((e) => !!e), !c).join("/");
          return (c ? "/" : "") + b || ".";
        }, gb = (a) => {
          var b = $a(a, 0);
          return Za.decode(a.buffer ? a.subarray(0, b) : new Uint8Array(a.slice(0, b)));
        }, hb = [], ib = (a) => {
          for (var b = 0, c = 0; c < a.length; ++c) {
            var d = a.charCodeAt(c);
            127 >= d ? b++ : 2047 >= d ? b += 2 : 55296 <= d && 57343 >= d ? (b += 4, ++c) : b += 3;
          }
          return b;
        }, M = (a, b, c, d) => {
          if (!(0 < d)) return 0;
          var e = c;
          d = c + d - 1;
          for (var g = 0; g < a.length; ++g) {
            var h = a.codePointAt(g);
            if (127 >= h) {
              if (c >= d) break;
              b[c++] = h;
            } else if (2047 >= h) {
              if (c + 1 >= d) break;
              b[c++] = 192 | h >> 6;
              b[c++] = 128 | h & 63;
            } else if (65535 >= h) {
              if (c + 2 >= d) break;
              b[c++] = 224 | h >> 12;
              b[c++] = 128 | h >> 6 & 63;
              b[c++] = 128 | h & 63;
            } else {
              if (c + 3 >= d) break;
              b[c++] = 240 | h >> 18;
              b[c++] = 128 | h >> 12 & 63;
              b[c++] = 128 | h >> 6 & 63;
              b[c++] = 128 | h & 63;
              g++;
            }
          }
          b[c] = 0;
          return c - e;
        }, jb = [];
        function kb(a, b) {
          jb[a] = { input: [], output: [], eb: b };
          mb(a, nb);
        }
        var nb = { open(a) {
          var b = jb[a.node.rdev];
          if (!b) throw new N(43);
          a.tty = b;
          a.seekable = false;
        }, close(a) {
          a.tty.eb.fsync(a.tty);
        }, fsync(a) {
          a.tty.eb.fsync(a.tty);
        }, read(a, b, c, d) {
          if (!a.tty || !a.tty.eb.Bb) throw new N(60);
          for (var e = 0, g = 0; g < d; g++) {
            try {
              var h = a.tty.eb.Bb(a.tty);
            } catch (q) {
              throw new N(29);
            }
            if (void 0 === h && 0 === e) throw new N(6);
            if (null === h || void 0 === h) break;
            e++;
            b[c + g] = h;
          }
          e && (a.node.atime = Date.now());
          return e;
        }, write(a, b, c, d) {
          if (!a.tty || !a.tty.eb.ub) throw new N(60);
          try {
            for (var e = 0; e < d; e++) a.tty.eb.ub(a.tty, b[c + e]);
          } catch (g) {
            throw new N(29);
          }
          d && (a.node.mtime = a.node.ctime = Date.now());
          return e;
        } }, wb = { Bb() {
          var _a2;
          a: {
            if (!hb.length) {
              var a = null;
              if (ca) {
                var b = Buffer.alloc(256), c = 0, d = process.stdin.fd;
                try {
                  c = fs3.readSync(d, b, 0, 256);
                } catch (e) {
                  if (e.toString().includes("EOF")) c = 0;
                  else throw e;
                }
                0 < c && (a = b.slice(0, c).toString("utf-8"));
              } else ((_a2 = globalThis.window) == null ? void 0 : _a2.prompt) && (a = window.prompt("Input: "), null !== a && (a += "\n"));
              if (!a) {
                a = null;
                break a;
              }
              b = Array(ib(a) + 1);
              a = M(a, b, 0, b.length);
              b.length = a;
              hb = b;
            }
            a = hb.shift();
          }
          return a;
        }, ub(a, b) {
          null === b || 10 === b ? (Ea(gb(a.output)), a.output = []) : 0 != b && a.output.push(b);
        }, fsync(a) {
          var _a2;
          0 < ((_a2 = a.output) == null ? void 0 : _a2.length) && (Ea(gb(a.output)), a.output = []);
        }, hc() {
          return { bc: 25856, dc: 5, ac: 191, cc: 35387, $b: [3, 28, 127, 21, 4, 0, 1, 0, 17, 19, 26, 0, 18, 15, 23, 22, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] };
        }, ic() {
          return 0;
        }, jc() {
          return [24, 80];
        } }, xb = { ub(a, b) {
          null === b || 10 === b ? (B(gb(a.output)), a.output = []) : 0 != b && a.output.push(b);
        }, fsync(a) {
          var _a2;
          0 < ((_a2 = a.output) == null ? void 0 : _a2.length) && (B(gb(a.output)), a.output = []);
        } }, O = { Wa: null, Xa() {
          return O.createNode(null, "/", 16895, 0);
        }, createNode(a, b, c, d) {
          if (24576 === (c & 61440) || 4096 === (c & 61440)) throw new N(63);
          O.Wa || (O.Wa = { dir: { node: { Ta: O.La.Ta, Ua: O.La.Ua, lookup: O.La.lookup, ib: O.La.ib, rename: O.La.rename, unlink: O.La.unlink, rmdir: O.La.rmdir, readdir: O.La.readdir, symlink: O.La.symlink }, stream: { Va: O.Ma.Va } }, file: { node: { Ta: O.La.Ta, Ua: O.La.Ua }, stream: { Va: O.Ma.Va, read: O.Ma.read, write: O.Ma.write, jb: O.Ma.jb, kb: O.Ma.kb } }, link: { node: { Ta: O.La.Ta, Ua: O.La.Ua, readlink: O.La.readlink }, stream: {} }, yb: { node: { Ta: O.La.Ta, Ua: O.La.Ua }, stream: yb } });
          c = zb(a, b, c, d);
          P(c.mode) ? (c.La = O.Wa.dir.node, c.Ma = O.Wa.dir.stream, c.Na = {}) : 32768 === (c.mode & 61440) ? (c.La = O.Wa.file.node, c.Ma = O.Wa.file.stream, c.Ra = 0, c.Na = null) : 40960 === (c.mode & 61440) ? (c.La = O.Wa.link.node, c.Ma = O.Wa.link.stream) : 8192 === (c.mode & 61440) && (c.La = O.Wa.yb.node, c.Ma = O.Wa.yb.stream);
          c.atime = c.mtime = c.ctime = Date.now();
          a && (a.Na[b] = c, a.atime = a.mtime = a.ctime = c.atime);
          return c;
        }, fc(a) {
          return a.Na ? a.Na.subarray ? a.Na.subarray(0, a.Ra) : new Uint8Array(a.Na) : new Uint8Array(0);
        }, La: {
          Ta(a) {
            var b = {};
            b.dev = 8192 === (a.mode & 61440) ? a.id : 1;
            b.ino = a.id;
            b.mode = a.mode;
            b.nlink = 1;
            b.uid = 0;
            b.gid = 0;
            b.rdev = a.rdev;
            P(a.mode) ? b.size = 4096 : 32768 === (a.mode & 61440) ? b.size = a.Ra : 40960 === (a.mode & 61440) ? b.size = a.link.length : b.size = 0;
            b.atime = new Date(a.atime);
            b.mtime = new Date(a.mtime);
            b.ctime = new Date(a.ctime);
            b.blksize = 4096;
            b.blocks = Math.ceil(b.size / b.blksize);
            return b;
          },
          Ua(a, b) {
            for (var c of ["mode", "atime", "mtime", "ctime"]) null != b[c] && (a[c] = b[c]);
            void 0 !== b.size && (b = b.size, a.Ra != b && (0 == b ? (a.Na = null, a.Ra = 0) : (c = a.Na, a.Na = new Uint8Array(b), c && a.Na.set(c.subarray(0, Math.min(b, a.Ra))), a.Ra = b)));
          },
          lookup() {
            O.nb || (O.nb = new N(44), O.nb.stack = "<generic error, no stack>");
            throw O.nb;
          },
          ib(a, b, c, d) {
            return O.createNode(a, b, c, d);
          },
          rename(a, b, c) {
            try {
              var d = Q(b, c);
            } catch (g) {
            }
            if (d) {
              if (P(a.mode)) for (var e in d.Na) throw new N(55);
              Ab(d);
            }
            delete a.parent.Na[a.name];
            b.Na[c] = a;
            a.name = c;
            b.ctime = b.mtime = a.parent.ctime = a.parent.mtime = Date.now();
          },
          unlink(a, b) {
            delete a.Na[b];
            a.ctime = a.mtime = Date.now();
          },
          rmdir(a, b) {
            var c = Q(a, b), d;
            for (d in c.Na) throw new N(55);
            delete a.Na[b];
            a.ctime = a.mtime = Date.now();
          },
          readdir(a) {
            return [".", "..", ...Object.keys(a.Na)];
          },
          symlink(a, b, c) {
            a = O.createNode(a, b, 41471, 0);
            a.link = c;
            return a;
          },
          readlink(a) {
            if (40960 !== (a.mode & 61440)) throw new N(28);
            return a.link;
          }
        }, Ma: { read(a, b, c, d, e) {
          var g = a.node.Na;
          if (e >= a.node.Ra) return 0;
          a = Math.min(a.node.Ra - e, d);
          if (8 < a && g.subarray) b.set(g.subarray(e, e + a), c);
          else for (d = 0; d < a; d++) b[c + d] = g[e + d];
          return a;
        }, write(a, b, c, d, e, g) {
          b.buffer === m.buffer && (g = false);
          if (!d) return 0;
          a = a.node;
          a.mtime = a.ctime = Date.now();
          if (b.subarray && (!a.Na || a.Na.subarray)) {
            if (g) return a.Na = b.subarray(c, c + d), a.Ra = d;
            if (0 === a.Ra && 0 === e) return a.Na = b.slice(c, c + d), a.Ra = d;
            if (e + d <= a.Ra) return a.Na.set(b.subarray(c, c + d), e), d;
          }
          g = e + d;
          var h = a.Na ? a.Na.length : 0;
          h >= g || (g = Math.max(g, h * (1048576 > h ? 2 : 1.125) >>> 0), 0 != h && (g = Math.max(g, 256)), h = a.Na, a.Na = new Uint8Array(g), 0 < a.Ra && a.Na.set(h.subarray(0, a.Ra), 0));
          if (a.Na.subarray && b.subarray) a.Na.set(b.subarray(c, c + d), e);
          else for (g = 0; g < d; g++) a.Na[e + g] = b[c + g];
          a.Ra = Math.max(a.Ra, e + d);
          return d;
        }, Va(a, b, c) {
          1 === c ? b += a.position : 2 === c && 32768 === (a.node.mode & 61440) && (b += a.node.Ra);
          if (0 > b) throw new N(28);
          return b;
        }, jb(a, b, c, d, e) {
          if (32768 !== (a.node.mode & 61440)) throw new N(43);
          a = a.node.Na;
          if (e & 2 || !a || a.buffer !== m.buffer) {
            e = true;
            d = 65536 * Math.ceil(b / 65536);
            var g = Bb(65536, d);
            g && C.fill(0, g, g + d);
            d = g;
            if (!d) throw new N(48);
            if (a) {
              if (0 < c || c + b < a.length) a.subarray ? a = a.subarray(c, c + b) : a = Array.prototype.slice.call(a, c, c + b);
              m.set(a, d);
            }
          } else e = false, d = a.byteOffset;
          return { Xb: d, Eb: e };
        }, kb(a, b, c, d) {
          O.Ma.write(a, b, 0, d, c, false);
          return 0;
        } } }, ja = (a, b) => {
          var c = 0;
          a && (c |= 365);
          b && (c |= 146);
          return c;
        }, Cb = null, Db2 = {}, Eb = [], Fb = 1, R2 = null, Gb = false, Hb = true, Ib = {}, N = class {
          name = "ErrnoError";
          constructor(a) {
            this.Pa = a;
          }
        }, Jb = class {
          hb = {};
          node = null;
          get flags() {
            return this.hb.flags;
          }
          set flags(a) {
            this.hb.flags = a;
          }
          get position() {
            return this.hb.position;
          }
          set position(a) {
            this.hb.position = a;
          }
        }, Kb = class {
          La = {};
          Ma = {};
          bb = null;
          constructor(a, b, c, d) {
            a ||= this;
            this.parent = a;
            this.Xa = a.Xa;
            this.id = Fb++;
            this.name = b;
            this.mode = c;
            this.rdev = d;
            this.atime = this.mtime = this.ctime = Date.now();
          }
          get read() {
            return 365 === (this.mode & 365);
          }
          set read(a) {
            a ? this.mode |= 365 : this.mode &= -366;
          }
          get write() {
            return 146 === (this.mode & 146);
          }
          set write(a) {
            a ? this.mode |= 146 : this.mode &= -147;
          }
        };
        function S3(a, b = {}) {
          if (!a) throw new N(44);
          b.pb ?? (b.pb = true);
          "/" === a.charAt(0) || (a = "//" + a);
          var c = 0;
          a: for (; 40 > c; c++) {
            a = a.split("/").filter((q) => !!q);
            for (var d = Cb, e = "/", g = 0; g < a.length; g++) {
              var h = g === a.length - 1;
              if (h && b.parent) break;
              if ("." !== a[g]) if (".." === a[g]) if (e = bb(e), d === d.parent) {
                a = e + "/" + a.slice(g + 1).join("/");
                c--;
                continue a;
              } else d = d.parent;
              else {
                e = ia(e + "/" + a[g]);
                try {
                  d = Q(d, a[g]);
                } catch (q) {
                  if (44 === (q == null ? void 0 : q.Pa) && h && b.Wb) return { path: e };
                  throw q;
                }
                !d.bb || h && !b.pb || (d = d.bb.root);
                if (40960 === (d.mode & 61440) && (!h || b.ab)) {
                  if (!d.La.readlink) throw new N(52);
                  d = d.La.readlink(d);
                  "/" === d.charAt(0) || (d = bb(e) + "/" + d);
                  a = d + "/" + a.slice(g + 1).join("/");
                  continue a;
                }
              }
            }
            return { path: e, node: d };
          }
          throw new N(32);
        }
        function ha(a) {
          for (var b; ; ) {
            if (a === a.parent) return a = a.Xa.Db, b ? "/" !== a[a.length - 1] ? `${a}/${b}` : a + b : a;
            b = b ? `${a.name}/${b}` : a.name;
            a = a.parent;
          }
        }
        function Lb(a, b) {
          for (var c = 0, d = 0; d < b.length; d++) c = (c << 5) - c + b.charCodeAt(d) | 0;
          return (a + c >>> 0) % R2.length;
        }
        function Ab(a) {
          var b = Lb(a.parent.id, a.name);
          if (R2[b] === a) R2[b] = a.cb;
          else for (b = R2[b]; b; ) {
            if (b.cb === a) {
              b.cb = a.cb;
              break;
            }
            b = b.cb;
          }
        }
        function Q(a, b) {
          var c = P(a.mode) ? (c = Mb(a, "x")) ? c : a.La.lookup ? 0 : 2 : 54;
          if (c) throw new N(c);
          for (c = R2[Lb(a.id, b)]; c; c = c.cb) {
            var d = c.name;
            if (c.parent.id === a.id && d === b) return c;
          }
          return a.La.lookup(a, b);
        }
        function zb(a, b, c, d) {
          a = new Kb(a, b, c, d);
          b = Lb(a.parent.id, a.name);
          a.cb = R2[b];
          return R2[b] = a;
        }
        function P(a) {
          return 16384 === (a & 61440);
        }
        function Nb(a) {
          var b = ["r", "w", "rw"][a & 3];
          a & 512 && (b += "w");
          return b;
        }
        function Mb(a, b) {
          if (Hb) return 0;
          if (!b.includes("r") || a.mode & 292) {
            if (b.includes("w") && !(a.mode & 146) || b.includes("x") && !(a.mode & 73)) return 2;
          } else return 2;
          return 0;
        }
        function Ob(a, b) {
          if (!P(a.mode)) return 54;
          try {
            return Q(a, b), 20;
          } catch (c) {
          }
          return Mb(a, "wx");
        }
        function Pb(a, b, c) {
          try {
            var d = Q(a, b);
          } catch (e) {
            return e.Pa;
          }
          if (a = Mb(a, "wx")) return a;
          if (c) {
            if (!P(d.mode)) return 54;
            if (d === d.parent || "/" === ha(d)) return 10;
          } else if (P(d.mode)) return 31;
          return 0;
        }
        function Qb(a) {
          if (!a) throw new N(63);
          return a;
        }
        function T2(a) {
          a = Eb[a];
          if (!a) throw new N(8);
          return a;
        }
        function Rb(a, b = -1) {
          a = Object.assign(new Jb(), a);
          if (-1 == b) a: {
            for (b = 0; 4096 >= b; b++) if (!Eb[b]) break a;
            throw new N(33);
          }
          a.fd = b;
          return Eb[b] = a;
        }
        function Sb(a, b = -1) {
          var _a2, _b2;
          a = Rb(a, b);
          (_b2 = (_a2 = a.Ma) == null ? void 0 : _a2.ec) == null ? void 0 : _b2.call(_a2, a);
          return a;
        }
        function Tb(a, b, c) {
          var d = a == null ? void 0 : a.Ma.Ua;
          a = d ? a : b;
          d ??= b.La.Ua;
          Qb(d);
          d(a, c);
        }
        var yb = { open(a) {
          var _a2, _b2;
          a.Ma = Db2[a.node.rdev].Ma;
          (_b2 = (_a2 = a.Ma).open) == null ? void 0 : _b2.call(_a2, a);
        }, Va() {
          throw new N(70);
        } };
        function mb(a, b) {
          Db2[a] = { Ma: b };
        }
        function Ub(a, b) {
          var c = "/" === b;
          if (c && Cb) throw new N(10);
          if (!c && b) {
            var d = S3(b, { pb: false });
            b = d.path;
            d = d.node;
            if (d.bb) throw new N(10);
            if (!P(d.mode)) throw new N(54);
          }
          b = { type: a, kc: {}, Db: b, Vb: [] };
          a = a.Xa(b);
          a.Xa = b;
          b.root = a;
          c ? Cb = a : d && (d.bb = b, d.Xa && d.Xa.Vb.push(b));
        }
        function Vb(a, b, c) {
          var d = S3(a, { parent: true }).node;
          a = cb(a);
          if (!a) throw new N(28);
          if ("." === a || ".." === a) throw new N(20);
          var e = Ob(d, a);
          if (e) throw new N(e);
          if (!d.La.ib) throw new N(63);
          return d.La.ib(d, a, b, c);
        }
        function ka(a, b = 438) {
          return Vb(a, b & 4095 | 32768, 0);
        }
        function U(a, b = 511) {
          return Vb(a, b & 1023 | 16384, 0);
        }
        function Wb(a, b, c) {
          "undefined" == typeof c && (c = b, b = 438);
          Vb(a, b | 8192, c);
        }
        function Xb(a, b) {
          if (!fb(a)) throw new N(44);
          var c = S3(b, { parent: true }).node;
          if (!c) throw new N(44);
          b = cb(b);
          var d = Ob(c, b);
          if (d) throw new N(d);
          if (!c.La.symlink) throw new N(63);
          c.La.symlink(c, b, a);
        }
        function Yb(a) {
          var b = S3(a, { parent: true }).node;
          a = cb(a);
          var c = Q(b, a), d = Pb(b, a, true);
          if (d) throw new N(d);
          if (!b.La.rmdir) throw new N(63);
          if (c.bb) throw new N(10);
          b.La.rmdir(b, a);
          Ab(c);
        }
        function ua(a) {
          var b = S3(a, { parent: true }).node;
          if (!b) throw new N(44);
          a = cb(a);
          var c = Q(b, a), d = Pb(b, a, false);
          if (d) throw new N(d);
          if (!b.La.unlink) throw new N(63);
          if (c.bb) throw new N(10);
          b.La.unlink(b, a);
          Ab(c);
        }
        function Zb(a, b) {
          a = S3(a, { ab: !b }).node;
          return Qb(a.La.Ta)(a);
        }
        function $b(a, b, c, d) {
          Tb(a, b, { mode: c & 4095 | b.mode & -4096, ctime: Date.now(), Lb: d });
        }
        function ma(a, b) {
          a = "string" == typeof a ? S3(a, { ab: true }).node : a;
          $b(null, a, b);
        }
        function ac(a, b, c) {
          if (P(b.mode)) throw new N(31);
          if (32768 !== (b.mode & 61440)) throw new N(28);
          var d = Mb(b, "w");
          if (d) throw new N(d);
          Tb(a, b, { size: c, timestamp: Date.now() });
        }
        function na(a, b, c = 438) {
          if ("" === a) throw new N(44);
          if ("string" == typeof b) {
            var d = { r: 0, "r+": 2, w: 577, "w+": 578, a: 1089, "a+": 1090 }[b];
            if ("undefined" == typeof d) throw Error(`Unknown file open mode: ${b}`);
            b = d;
          }
          c = b & 64 ? c & 4095 | 32768 : 0;
          if ("object" == typeof a) d = a;
          else {
            var e = a.endsWith("/");
            a = S3(a, { ab: !(b & 131072), Wb: true });
            d = a.node;
            a = a.path;
          }
          var g = false;
          if (b & 64) if (d) {
            if (b & 128) throw new N(20);
          } else {
            if (e) throw new N(31);
            d = Vb(a, c | 511, 0);
            g = true;
          }
          if (!d) throw new N(44);
          8192 === (d.mode & 61440) && (b &= -513);
          if (b & 65536 && !P(d.mode)) throw new N(54);
          if (!g && (e = d ? 40960 === (d.mode & 61440) ? 32 : P(d.mode) && ("r" !== Nb(b) || b & 576) ? 31 : Mb(d, Nb(b)) : 44)) throw new N(e);
          b & 512 && !g && (e = d, e = "string" == typeof e ? S3(e, { ab: true }).node : e, ac(null, e, 0));
          b &= -131713;
          e = Rb({ node: d, path: ha(d), flags: b, seekable: true, position: 0, Ma: d.Ma, Yb: [], error: false });
          e.Ma.open && e.Ma.open(e);
          g && ma(d, c & 511);
          !k.logReadFiles || b & 1 || a in Ib || (Ib[a] = 1);
          return e;
        }
        function pa(a) {
          if (null === a.fd) throw new N(8);
          a.rb && (a.rb = null);
          try {
            a.Ma.close && a.Ma.close(a);
          } catch (b) {
            throw b;
          } finally {
            Eb[a.fd] = null;
          }
          a.fd = null;
        }
        function bc(a, b, c) {
          if (null === a.fd) throw new N(8);
          if (!a.seekable || !a.Ma.Va) throw new N(70);
          if (0 != c && 1 != c && 2 != c) throw new N(28);
          a.position = a.Ma.Va(a, b, c);
          a.Yb = [];
        }
        function cc(a, b, c, d, e) {
          if (0 > d || 0 > e) throw new N(28);
          if (null === a.fd) throw new N(8);
          if (1 === (a.flags & 2097155)) throw new N(8);
          if (P(a.node.mode)) throw new N(31);
          if (!a.Ma.read) throw new N(28);
          var g = "undefined" != typeof e;
          if (!g) e = a.position;
          else if (!a.seekable) throw new N(70);
          b = a.Ma.read(a, b, c, d, e);
          g || (a.position += b);
          return b;
        }
        function oa(a, b, c, d, e) {
          if (0 > d || 0 > e) throw new N(28);
          if (null === a.fd) throw new N(8);
          if (0 === (a.flags & 2097155)) throw new N(8);
          if (P(a.node.mode)) throw new N(31);
          if (!a.Ma.write) throw new N(28);
          a.seekable && a.flags & 1024 && bc(a, 0, 2);
          var g = "undefined" != typeof e;
          if (!g) e = a.position;
          else if (!a.seekable) throw new N(70);
          b = a.Ma.write(a, b, c, d, e, void 0);
          g || (a.position += b);
          return b;
        }
        function ta(a) {
          var b = b || 0;
          var c = "binary";
          "utf8" !== c && "binary" !== c && Na(`Invalid encoding type "${c}"`);
          b = na(a, b);
          a = Zb(a).size;
          var d = new Uint8Array(a);
          cc(b, d, 0, a, 0);
          "utf8" === c && (d = gb(d));
          pa(b);
          return d;
        }
        function W(a, b, c) {
          a = ia("/dev/" + a);
          var d = ja(!!b, !!c);
          W.Cb ?? (W.Cb = 64);
          var e = W.Cb++ << 8 | 0;
          mb(e, { open(g) {
            g.seekable = false;
          }, close() {
            var _a2;
            ((_a2 = c == null ? void 0 : c.buffer) == null ? void 0 : _a2.length) && c(10);
          }, read(g, h, q, v) {
            for (var u = 0, x = 0; x < v; x++) {
              try {
                var D = b();
              } catch (pb) {
                throw new N(29);
              }
              if (void 0 === D && 0 === u) throw new N(6);
              if (null === D || void 0 === D) break;
              u++;
              h[q + x] = D;
            }
            u && (g.node.atime = Date.now());
            return u;
          }, write(g, h, q, v) {
            for (var u = 0; u < v; u++) try {
              c(h[q + u]);
            } catch (x) {
              throw new N(29);
            }
            v && (g.node.mtime = g.node.ctime = Date.now());
            return u;
          } });
          Wb(a, d, e);
        }
        var X = {};
        function Y(a, b, c) {
          if ("/" === b.charAt(0)) return b;
          a = -100 === a ? "/" : T2(a).path;
          if (0 == b.length) {
            if (!c) throw new N(44);
            return a;
          }
          return a + "/" + b;
        }
        function mc(a, b) {
          F[a >> 2] = b.dev;
          F[a + 4 >> 2] = b.mode;
          F[a + 8 >> 2] = b.nlink;
          F[a + 12 >> 2] = b.uid;
          F[a + 16 >> 2] = b.gid;
          F[a + 20 >> 2] = b.rdev;
          H[a + 24 >> 3] = BigInt(b.size);
          E[a + 32 >> 2] = 4096;
          E[a + 36 >> 2] = b.blocks;
          var c = b.atime.getTime(), d = b.mtime.getTime(), e = b.ctime.getTime();
          H[a + 40 >> 3] = BigInt(Math.floor(c / 1e3));
          F[a + 48 >> 2] = c % 1e3 * 1e6;
          H[a + 56 >> 3] = BigInt(Math.floor(d / 1e3));
          F[a + 64 >> 2] = d % 1e3 * 1e6;
          H[a + 72 >> 3] = BigInt(Math.floor(e / 1e3));
          F[a + 80 >> 2] = e % 1e3 * 1e6;
          H[a + 88 >> 3] = BigInt(b.ino);
          return 0;
        }
        var Ec = void 0, Gc = () => {
          var a = E[+Ec >> 2];
          Ec += 4;
          return a;
        }, Hc = 0, Ic = [0, 31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335], Jc = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334], Kc = {}, Lc = (a) => {
          var _a2;
          Ha = a;
          Ya || 0 < Hc || ((_a2 = k.onExit) == null ? void 0 : _a2.call(k, a), Ga = true);
          ya(a, new Sa(a));
        }, Mc = (a) => {
          if (!Ga) try {
            a();
          } catch (b) {
            b instanceof Sa || "unwind" == b || ya(1, b);
          } finally {
            if (!(Ya || 0 < Hc)) try {
              Ha = a = Ha, Lc(a);
            } catch (b) {
              b instanceof Sa || "unwind" == b || ya(1, b);
            }
          }
        }, Nc = {}, Pc = () => {
          var _a2;
          if (!Oc) {
            var a = { USER: "web_user", LOGNAME: "web_user", PATH: "/", PWD: "/", HOME: "/home/web_user", LANG: (((_a2 = globalThis.navigator) == null ? void 0 : _a2.language) ?? "C").replace("-", "_") + ".UTF-8", _: xa || "./this.program" }, b;
            for (b in Nc) void 0 === Nc[b] ? delete a[b] : a[b] = Nc[b];
            var c = [];
            for (b in a) c.push(`${b}=${a[b]}`);
            Oc = c;
          }
          return Oc;
        }, Oc, Qc = (a, b, c, d) => {
          var e = { string: (u) => {
            var x = 0;
            if (null !== u && void 0 !== u && 0 !== u) {
              x = ib(u) + 1;
              var D = y(x);
              M(u, C, D, x);
              x = D;
            }
            return x;
          }, array: (u) => {
            var x = y(u.length);
            m.set(u, x);
            return x;
          } };
          a = k["_" + a];
          var g = [], h = 0;
          if (d) for (var q = 0; q < d.length; q++) {
            var v = e[c[q]];
            v ? (0 === h && (h = qa()), g[q] = v(d[q])) : g[q] = d[q];
          }
          c = a(...g);
          return c = (function(u) {
            0 !== h && sa(h);
            return "string" === b ? z(u) : "boolean" === b ? !!u : u;
          })(c);
        }, fa = (a) => {
          var b = ib(a) + 1, c = da(b);
          c && M(a, C, c, b);
          return c;
        }, Rc, Sc = [], A = (a) => {
          Rc.delete(Z.get(a));
          Z.set(a, null);
          Sc.push(a);
        }, Tc = (a) => {
          const b = a.length;
          return [b % 128 | 128, b >> 7, ...a];
        }, Uc = { i: 127, p: 127, j: 126, f: 125, d: 124, e: 111 }, Vc = (a) => Tc(Array.from(a, (b) => Uc[b])), wa = (a, b) => {
          if (!Rc) {
            Rc = /* @__PURE__ */ new WeakMap();
            var c = Z.length;
            if (Rc) for (var d = 0; d < 0 + c; d++) {
              var e = Z.get(d);
              e && Rc.set(e, d);
            }
          }
          if (c = Rc.get(a) || 0) return c;
          c = Sc.length ? Sc.pop() : Z.grow(1);
          try {
            Z.set(c, a);
          } catch (g) {
            if (!(g instanceof TypeError)) throw g;
            b = Uint8Array.of(0, 97, 115, 109, 1, 0, 0, 0, 1, ...Tc([1, 96, ...Vc(b.slice(1)), ...Vc("v" === b[0] ? "" : b[0])]), 2, 7, 1, 1, 101, 1, 102, 0, 0, 7, 5, 1, 1, 102, 0, 0);
            b = new WebAssembly.Module(b);
            b = new WebAssembly.Instance(b, { e: { f: a } }).exports.f;
            Z.set(c, b);
          }
          Rc.set(a, c);
          return c;
        };
        R2 = Array(4096);
        Ub(O, "/");
        U("/tmp");
        U("/home");
        U("/home/web_user");
        (function() {
          U("/dev");
          mb(259, { read: () => 0, write: (d, e, g, h) => h, Va: () => 0 });
          Wb("/dev/null", 259);
          kb(1280, wb);
          kb(1536, xb);
          Wb("/dev/tty", 1280);
          Wb("/dev/tty1", 1536);
          var a = new Uint8Array(1024), b = 0, c = () => {
            0 === b && (eb(a), b = a.byteLength);
            return a[--b];
          };
          W("random", c);
          W("urandom", c);
          U("/dev/shm");
          U("/dev/shm/tmp");
        })();
        (function() {
          U("/proc");
          var a = U("/proc/self");
          U("/proc/self/fd");
          Ub({ Xa() {
            var b = zb(a, "fd", 16895, 73);
            b.Ma = { Va: O.Ma.Va };
            b.La = { lookup(c, d) {
              c = +d;
              var e = T2(c);
              c = { parent: null, Xa: { Db: "fake" }, La: { readlink: () => e.path }, id: c + 1 };
              return c.parent = c;
            }, readdir() {
              return Array.from(Eb.entries()).filter(([, c]) => c).map(([c]) => c.toString());
            } };
            return b;
          } }, "/proc/self/fd");
        })();
        k.noExitRuntime && (Ya = k.noExitRuntime);
        k.print && (Ea = k.print);
        k.printErr && (B = k.printErr);
        k.wasmBinary && (Fa = k.wasmBinary);
        k.thisProgram && (xa = k.thisProgram);
        if (k.preInit) for ("function" == typeof k.preInit && (k.preInit = [k.preInit]); 0 < k.preInit.length; ) k.preInit.shift()();
        k.stackSave = () => qa();
        k.stackRestore = (a) => sa(a);
        k.stackAlloc = (a) => y(a);
        k.cwrap = (a, b, c, d) => {
          var e = !c || c.every((g) => "number" === g || "boolean" === g);
          return "string" !== b && e && !d ? k["_" + a] : (...g) => Qc(a, b, c, g);
        };
        k.addFunction = wa;
        k.removeFunction = A;
        k.UTF8ToString = z;
        k.stringToNewUTF8 = fa;
        k.writeArrayToMemory = (a, b) => {
          m.set(a, b);
        };
        var da, ea, Bb, Wc, sa, y, qa, Ma, Z, Xc = {
          a: (a, b, c, d) => Na(`Assertion failed: ${z(a)}, at: ` + [b ? z(b) : "unknown filename", c, d ? z(d) : "unknown function"]),
          i: function(a, b) {
            try {
              return a = z(a), ma(a, b), 0;
            } catch (c) {
              if ("undefined" == typeof X || "ErrnoError" !== c.name) throw c;
              return -c.Pa;
            }
          },
          L: function(a, b, c) {
            try {
              b = z(b);
              b = Y(a, b);
              if (c & -8) return -28;
              var d = S3(b, { ab: true }).node;
              if (!d) return -44;
              a = "";
              c & 4 && (a += "r");
              c & 2 && (a += "w");
              c & 1 && (a += "x");
              return a && Mb(d, a) ? -2 : 0;
            } catch (e) {
              if ("undefined" == typeof X || "ErrnoError" !== e.name) throw e;
              return -e.Pa;
            }
          },
          j: function(a, b) {
            try {
              var c = T2(a);
              $b(c, c.node, b, false);
              return 0;
            } catch (d) {
              if ("undefined" == typeof X || "ErrnoError" !== d.name) throw d;
              return -d.Pa;
            }
          },
          h: function(a) {
            try {
              var b = T2(a);
              Tb(b, b.node, { timestamp: Date.now(), Lb: false });
              return 0;
            } catch (c) {
              if ("undefined" == typeof X || "ErrnoError" !== c.name) throw c;
              return -c.Pa;
            }
          },
          b: function(a, b, c) {
            Ec = c;
            try {
              var d = T2(a);
              switch (b) {
                case 0:
                  var e = Gc();
                  if (0 > e) break;
                  for (; Eb[e]; ) e++;
                  return Sb(d, e).fd;
                case 1:
                case 2:
                  return 0;
                case 3:
                  return d.flags;
                case 4:
                  return e = Gc(), d.flags |= e, 0;
                case 12:
                  return e = Gc(), Ia[e + 0 >> 1] = 2, 0;
                case 13:
                case 14:
                  return 0;
              }
              return -28;
            } catch (g) {
              if ("undefined" == typeof X || "ErrnoError" !== g.name) throw g;
              return -g.Pa;
            }
          },
          g: function(a, b) {
            try {
              var c = T2(a), d = c.node, e = c.Ma.Ta;
              a = e ? c : d;
              e ??= d.La.Ta;
              Qb(e);
              var g = e(a);
              return mc(b, g);
            } catch (h) {
              if ("undefined" == typeof X || "ErrnoError" !== h.name) throw h;
              return -h.Pa;
            }
          },
          H: function(a, b) {
            b = -9007199254740992 > b || 9007199254740992 < b ? NaN : Number(b);
            try {
              if (isNaN(b)) return -61;
              var c = T2(a);
              if (0 > b || 0 === (c.flags & 2097155)) throw new N(28);
              ac(c, c.node, b);
              return 0;
            } catch (d) {
              if ("undefined" == typeof X || "ErrnoError" !== d.name) throw d;
              return -d.Pa;
            }
          },
          G: function(a, b) {
            try {
              if (0 === b) return -28;
              var c = ib("/") + 1;
              if (b < c) return -68;
              M("/", C, a, b);
              return c;
            } catch (d) {
              if ("undefined" == typeof X || "ErrnoError" !== d.name) throw d;
              return -d.Pa;
            }
          },
          K: function(a, b) {
            try {
              return a = z(a), mc(b, Zb(a, true));
            } catch (c) {
              if ("undefined" == typeof X || "ErrnoError" !== c.name) throw c;
              return -c.Pa;
            }
          },
          C: function(a, b, c) {
            try {
              return b = z(b), b = Y(a, b), U(b, c), 0;
            } catch (d) {
              if ("undefined" == typeof X || "ErrnoError" !== d.name) throw d;
              return -d.Pa;
            }
          },
          J: function(a, b, c, d) {
            try {
              b = z(b);
              var e = d & 256;
              b = Y(a, b, d & 4096);
              return mc(c, e ? Zb(b, true) : Zb(b));
            } catch (g) {
              if ("undefined" == typeof X || "ErrnoError" !== g.name) throw g;
              return -g.Pa;
            }
          },
          x: function(a, b, c, d) {
            Ec = d;
            try {
              b = z(b);
              b = Y(a, b);
              var e = d ? Gc() : 0;
              return na(b, c, e).fd;
            } catch (g) {
              if ("undefined" == typeof X || "ErrnoError" !== g.name) throw g;
              return -g.Pa;
            }
          },
          v: function(a, b, c, d) {
            try {
              b = z(b);
              b = Y(a, b);
              if (0 >= d) return -28;
              var e = S3(b).node;
              if (!e) throw new N(44);
              if (!e.La.readlink) throw new N(28);
              var g = e.La.readlink(e);
              var h = Math.min(d, ib(g)), q = m[c + h];
              M(
                g,
                C,
                c,
                d + 1
              );
              m[c + h] = q;
              return h;
            } catch (v) {
              if ("undefined" == typeof X || "ErrnoError" !== v.name) throw v;
              return -v.Pa;
            }
          },
          u: function(a) {
            try {
              return a = z(a), Yb(a), 0;
            } catch (b) {
              if ("undefined" == typeof X || "ErrnoError" !== b.name) throw b;
              return -b.Pa;
            }
          },
          f: function(a, b) {
            try {
              return a = z(a), mc(b, Zb(a));
            } catch (c) {
              if ("undefined" == typeof X || "ErrnoError" !== c.name) throw c;
              return -c.Pa;
            }
          },
          r: function(a, b, c) {
            try {
              b = z(b);
              b = Y(a, b);
              if (c) if (512 === c) Yb(b);
              else return -28;
              else ua(b);
              return 0;
            } catch (d) {
              if ("undefined" == typeof X || "ErrnoError" !== d.name) throw d;
              return -d.Pa;
            }
          },
          q: function(a, b, c) {
            try {
              b = z(b);
              b = Y(a, b, true);
              var d = Date.now(), e, g;
              if (c) {
                var h = F[c >> 2] + 4294967296 * E[c + 4 >> 2], q = E[c + 8 >> 2];
                1073741823 == q ? e = d : 1073741822 == q ? e = null : e = 1e3 * h + q / 1e6;
                c += 16;
                h = F[c >> 2] + 4294967296 * E[c + 4 >> 2];
                q = E[c + 8 >> 2];
                1073741823 == q ? g = d : 1073741822 == q ? g = null : g = 1e3 * h + q / 1e6;
              } else g = e = d;
              if (null !== (g ?? e)) {
                a = e;
                var v = S3(b, { ab: true }).node;
                Qb(v.La.Ua)(v, { atime: a, mtime: g });
              }
              return 0;
            } catch (u) {
              if ("undefined" == typeof X || "ErrnoError" !== u.name) throw u;
              return -u.Pa;
            }
          },
          m: () => Na(""),
          l: () => {
            Ya = false;
            Hc = 0;
          },
          A: function(a, b) {
            a = -9007199254740992 > a || 9007199254740992 < a ? NaN : Number(a);
            a = new Date(1e3 * a);
            E[b >> 2] = a.getSeconds();
            E[b + 4 >> 2] = a.getMinutes();
            E[b + 8 >> 2] = a.getHours();
            E[b + 12 >> 2] = a.getDate();
            E[b + 16 >> 2] = a.getMonth();
            E[b + 20 >> 2] = a.getFullYear() - 1900;
            E[b + 24 >> 2] = a.getDay();
            var c = a.getFullYear();
            E[b + 28 >> 2] = (0 !== c % 4 || 0 === c % 100 && 0 !== c % 400 ? Jc : Ic)[a.getMonth()] + a.getDate() - 1 | 0;
            E[b + 36 >> 2] = -(60 * a.getTimezoneOffset());
            c = new Date(a.getFullYear(), 6, 1).getTimezoneOffset();
            var d = new Date(a.getFullYear(), 0, 1).getTimezoneOffset();
            E[b + 32 >> 2] = (c != d && a.getTimezoneOffset() == Math.min(d, c)) | 0;
          },
          y: function(a, b, c, d, e, g, h) {
            e = -9007199254740992 > e || 9007199254740992 < e ? NaN : Number(e);
            try {
              var q = T2(d);
              if (0 !== (b & 2) && 0 === (c & 2) && 2 !== (q.flags & 2097155)) throw new N(2);
              if (1 === (q.flags & 2097155)) throw new N(2);
              if (!q.Ma.jb) throw new N(43);
              if (!a) throw new N(28);
              var v = q.Ma.jb(q, a, e, b, c);
              var u = v.Xb;
              E[g >> 2] = v.Eb;
              F[h >> 2] = u;
              return 0;
            } catch (x) {
              if ("undefined" == typeof X || "ErrnoError" !== x.name) throw x;
              return -x.Pa;
            }
          },
          z: function(a, b, c, d, e, g) {
            g = -9007199254740992 > g || 9007199254740992 < g ? NaN : Number(g);
            try {
              var h = T2(e);
              if (c & 2) {
                c = g;
                if (32768 !== (h.node.mode & 61440)) throw new N(43);
                if (!(d & 2)) {
                  var q = C.slice(a, a + b);
                  h.Ma.kb && h.Ma.kb(h, q, c, b, d);
                }
              }
            } catch (v) {
              if ("undefined" == typeof X || "ErrnoError" !== v.name) throw v;
              return -v.Pa;
            }
          },
          n: (a, b) => {
            Kc[a] && (clearTimeout(Kc[a].id), delete Kc[a]);
            if (!b) return 0;
            var c = setTimeout(() => {
              delete Kc[a];
              Mc(() => Wc(a, performance.now()));
            }, b);
            Kc[a] = { id: c, lc: b };
            return 0;
          },
          B: (a, b, c, d) => {
            var e = (/* @__PURE__ */ new Date()).getFullYear(), g = new Date(e, 0, 1).getTimezoneOffset();
            e = new Date(e, 6, 1).getTimezoneOffset();
            F[a >> 2] = 60 * Math.max(g, e);
            E[b >> 2] = Number(g != e);
            b = (h) => {
              var q = Math.abs(h);
              return `UTC${0 <= h ? "-" : "+"}${String(Math.floor(q / 60)).padStart(2, "0")}${String(q % 60).padStart(2, "0")}`;
            };
            a = b(g);
            b = b(e);
            e < g ? (M(a, C, c, 17), M(b, C, d, 17)) : (M(a, C, d, 17), M(b, C, c, 17));
          },
          d: () => Date.now(),
          s: () => 2147483648,
          c: () => performance.now(),
          o: (a) => {
            var b = C.length;
            a >>>= 0;
            if (2147483648 < a) return false;
            for (var c = 1; 4 >= c; c *= 2) {
              var d = b * (1 + 0.2 / c);
              d = Math.min(d, a + 100663296);
              a: {
                d = (Math.min(2147483648, 65536 * Math.ceil(Math.max(
                  a,
                  d
                ) / 65536)) - Ma.buffer.byteLength + 65535) / 65536 | 0;
                try {
                  Ma.grow(d);
                  La();
                  var e = 1;
                  break a;
                } catch (g) {
                }
                e = void 0;
              }
              if (e) return true;
            }
            return false;
          },
          E: (a, b) => {
            var c = 0, d = 0, e;
            for (e of Pc()) {
              var g = b + c;
              F[a + d >> 2] = g;
              c += M(e, C, g, Infinity) + 1;
              d += 4;
            }
            return 0;
          },
          F: (a, b) => {
            var c = Pc();
            F[a >> 2] = c.length;
            a = 0;
            for (var d of c) a += ib(d) + 1;
            F[b >> 2] = a;
            return 0;
          },
          e: function(a) {
            try {
              var b = T2(a);
              pa(b);
              return 0;
            } catch (c) {
              if ("undefined" == typeof X || "ErrnoError" !== c.name) throw c;
              return c.Pa;
            }
          },
          p: function(a, b) {
            try {
              var c = T2(a);
              m[b] = c.tty ? 2 : P(c.mode) ? 3 : 40960 === (c.mode & 61440) ? 7 : 4;
              Ia[b + 2 >> 1] = 0;
              H[b + 8 >> 3] = BigInt(0);
              H[b + 16 >> 3] = BigInt(0);
              return 0;
            } catch (d) {
              if ("undefined" == typeof X || "ErrnoError" !== d.name) throw d;
              return d.Pa;
            }
          },
          w: function(a, b, c, d) {
            try {
              a: {
                var e = T2(a);
                a = b;
                for (var g, h = b = 0; h < c; h++) {
                  var q = F[a >> 2], v = F[a + 4 >> 2];
                  a += 8;
                  var u = cc(e, m, q, v, g);
                  if (0 > u) {
                    var x = -1;
                    break a;
                  }
                  b += u;
                  if (u < v) break;
                  "undefined" != typeof g && (g += u);
                }
                x = b;
              }
              F[d >> 2] = x;
              return 0;
            } catch (D) {
              if ("undefined" == typeof X || "ErrnoError" !== D.name) throw D;
              return D.Pa;
            }
          },
          D: function(a, b, c, d) {
            b = -9007199254740992 > b || 9007199254740992 < b ? NaN : Number(b);
            try {
              if (isNaN(b)) return 61;
              var e = T2(a);
              bc(e, b, c);
              H[d >> 3] = BigInt(e.position);
              e.rb && 0 === b && 0 === c && (e.rb = null);
              return 0;
            } catch (g) {
              if ("undefined" == typeof X || "ErrnoError" !== g.name) throw g;
              return g.Pa;
            }
          },
          I: function(a) {
            var _a2, _b2;
            try {
              var b = T2(a);
              return (_b2 = (_a2 = b.Ma) == null ? void 0 : _a2.fsync) == null ? void 0 : _b2.call(_a2, b);
            } catch (c) {
              if ("undefined" == typeof X || "ErrnoError" !== c.name) throw c;
              return c.Pa;
            }
          },
          t: function(a, b, c, d) {
            try {
              a: {
                var e = T2(a);
                a = b;
                for (var g, h = b = 0; h < c; h++) {
                  var q = F[a >> 2], v = F[a + 4 >> 2];
                  a += 8;
                  var u = oa(e, m, q, v, g);
                  if (0 > u) {
                    var x = -1;
                    break a;
                  }
                  b += u;
                  if (u < v) break;
                  "undefined" != typeof g && (g += u);
                }
                x = b;
              }
              F[d >> 2] = x;
              return 0;
            } catch (D) {
              if ("undefined" == typeof X || "ErrnoError" !== D.name) throw D;
              return D.Pa;
            }
          },
          k: Lc
        };
        function Yc() {
          function a() {
            var _a2;
            k.calledRun = true;
            if (!Ga) {
              if (!k.noFSInit && !Gb) {
                var b, c;
                Gb = true;
                b ??= k.stdin;
                c ??= k.stdout;
                d ??= k.stderr;
                b ? W("stdin", b) : Xb("/dev/tty", "/dev/stdin");
                c ? W("stdout", null, c) : Xb("/dev/tty", "/dev/stdout");
                d ? W("stderr", null, d) : Xb("/dev/tty1", "/dev/stderr");
                na("/dev/stdin", 0);
                na("/dev/stdout", 1);
                na("/dev/stderr", 1);
              }
              Zc.N();
              Hb = false;
              (_a2 = k.onRuntimeInitialized) == null ? void 0 : _a2.call(k);
              if (k.postRun) for ("function" == typeof k.postRun && (k.postRun = [k.postRun]); k.postRun.length; ) {
                var d = k.postRun.shift();
                Ua.push(d);
              }
              Ta(Ua);
            }
          }
          if (0 < K) Xa = Yc;
          else {
            if (k.preRun) for ("function" == typeof k.preRun && (k.preRun = [k.preRun]); k.preRun.length; ) Wa();
            Ta(Va);
            0 < K ? Xa = Yc : k.setStatus ? (k.setStatus("Running..."), setTimeout(() => {
              setTimeout(() => k.setStatus(""), 1);
              a();
            }, 1)) : a();
          }
        }
        var Zc;
        (async function() {
          var _a2;
          function a(c) {
            var _a3;
            c = Zc = c.exports;
            k._sqlite3_free = c.P;
            k._sqlite3_value_text = c.Q;
            k._sqlite3_prepare_v2 = c.R;
            k._sqlite3_step = c.S;
            k._sqlite3_reset = c.T;
            k._sqlite3_exec = c.U;
            k._sqlite3_finalize = c.V;
            k._sqlite3_column_name = c.W;
            k._sqlite3_column_text = c.X;
            k._sqlite3_column_type = c.Y;
            k._sqlite3_errmsg = c.Z;
            k._sqlite3_clear_bindings = c._;
            k._sqlite3_value_blob = c.$;
            k._sqlite3_value_bytes = c.aa;
            k._sqlite3_value_double = c.ba;
            k._sqlite3_value_int = c.ca;
            k._sqlite3_value_type = c.da;
            k._sqlite3_result_blob = c.ea;
            k._sqlite3_result_double = c.fa;
            k._sqlite3_result_error = c.ga;
            k._sqlite3_result_int = c.ha;
            k._sqlite3_result_int64 = c.ia;
            k._sqlite3_result_null = c.ja;
            k._sqlite3_result_text = c.ka;
            k._sqlite3_aggregate_context = c.la;
            k._sqlite3_column_count = c.ma;
            k._sqlite3_data_count = c.na;
            k._sqlite3_column_blob = c.oa;
            k._sqlite3_column_bytes = c.pa;
            k._sqlite3_column_double = c.qa;
            k._sqlite3_bind_blob = c.ra;
            k._sqlite3_bind_double = c.sa;
            k._sqlite3_bind_int = c.ta;
            k._sqlite3_bind_text = c.ua;
            k._sqlite3_bind_parameter_index = c.va;
            k._sqlite3_sql = c.wa;
            k._sqlite3_normalized_sql = c.xa;
            k._sqlite3_changes = c.ya;
            k._sqlite3_close_v2 = c.za;
            k._sqlite3_create_function_v2 = c.Aa;
            k._sqlite3_update_hook = c.Ba;
            k._sqlite3_open = c.Ca;
            da = k._malloc = c.Da;
            ea = k._free = c.Ea;
            k._RegisterExtensionFunctions = c.Fa;
            Bb = c.Ga;
            Wc = c.Ha;
            sa = c.Ia;
            y = c.Ja;
            qa = c.Ka;
            Ma = c.M;
            Z = c.O;
            La();
            K--;
            (_a3 = k.monitorRunDependencies) == null ? void 0 : _a3.call(k, K);
            0 == K && Xa && (c = Xa, Xa = null, c());
            return Zc;
          }
          K++;
          (_a2 = k.monitorRunDependencies) == null ? void 0 : _a2.call(k, K);
          var b = { a: Xc };
          if (k.instantiateWasm) return new Promise((c) => {
            k.instantiateWasm(b, (d, e) => {
              c(a(d, e));
            });
          });
          Oa ??= k.locateFile ? k.locateFile("sql-wasm.wasm", Aa) : Aa + "sql-wasm.wasm";
          return a((await Ra(b)).instance);
        })();
        Yc();
        return Module;
      });
      return initSqlJsPromise;
    };
    if (typeof exports2 === "object" && typeof module2 === "object") {
      module2.exports = initSqlJs2;
      module2.exports.default = initSqlJs2;
    } else if (typeof define === "function" && define["amd"]) {
      define([], function() {
        return initSqlJs2;
      });
    } else if (typeof exports2 === "object") {
      exports2["Module"] = initSqlJs2;
    }
  }
});

// server/fivem.ts
var import_node_path3 = __toESM(require("node:path"), 1);

// server/db.ts
var import_node_fs = __toESM(require("node:fs"), 1);
var import_node_path = __toESM(require("node:path"), 1);
var import_sql = __toESM(require_sql_wasm(), 1);
var Stmt = class {
  constructor(d, sql) {
    this.d = d;
    this.sql = sql;
  }
  d;
  sql;
  exec(params, fn) {
    const s = this.d.inner.prepare(this.sql);
    try {
      s.bind(params.map((p) => p === void 0 ? null : typeof p === "bigint" ? Number(p) : p));
      return fn(s);
    } finally {
      s.free();
    }
  }
  run(...params) {
    var _a;
    this.exec(params, (s) => {
      s.step();
    });
    this.d.dirty = true;
    const r = ((_a = this.d.inner.exec("SELECT last_insert_rowid() id, changes() c")[0]) == null ? void 0 : _a.values[0]) ?? [0, 0];
    return { lastInsertRowid: r[0], changes: r[1] };
  }
  get(...params) {
    return this.exec(params, (s) => s.step() ? s.getAsObject() : void 0);
  }
  all(...params) {
    return this.exec(params, (s) => {
      const out = [];
      while (s.step()) out.push(s.getAsObject());
      return out;
    });
  }
};
var Db = class {
  inner;
  dirty = false;
  file = "";
  prepare(sql) {
    return new Stmt(this, sql);
  }
  exec(sql) {
    this.inner.exec(sql);
    this.dirty = true;
  }
  transaction(fn) {
    return (...a) => {
      this.exec("BEGIN");
      try {
        const r = fn(...a);
        this.exec("COMMIT");
        return r;
      } catch (e) {
        this.exec("ROLLBACK");
        throw e;
      }
    };
  }
  save() {
    if (!this.dirty || !this.file) return;
    this.dirty = false;
    try {
      const data = this.inner.export();
      this.inner.exec("PRAGMA foreign_keys = ON");
      const tmp = this.file + ".tmp";
      import_node_fs.default.writeFileSync(tmp, Buffer.from(data));
      import_node_fs.default.renameSync(tmp, this.file);
    } catch (e) {
      console.error("[cbrn] Datenbank konnte nicht gespeichert werden:", e);
      this.dirty = true;
    }
  }
};
var db = new Db();
async function initDb(file, wasmFile) {
  const SQL = await (0, import_sql.default)({ wasmBinary: import_node_fs.default.readFileSync(wasmFile) });
  let data;
  if (file) {
    import_node_fs.default.mkdirSync(import_node_path.default.dirname(file), { recursive: true });
    if (import_node_fs.default.existsSync(file)) data = import_node_fs.default.readFileSync(file);
  }
  db.inner = new SQL.Database(data);
  db.file = file ?? "";
  db.inner.exec("PRAGMA foreign_keys = ON;");
  setupSchema();
  db.dirty = true;
  db.save();
}
var SCHEMA = `
CREATE TABLE IF NOT EXISTS sources (id TEXT PRIMARY KEY, name TEXT NOT NULL, document TEXT, url TEXT, publisher_priority INTEGER, retrieved_at TEXT, data_stand TEXT);
CREATE TABLE IF NOT EXISTS substances (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, synonyms TEXT, cas TEXT, formula TEXT, molar_mass REAL, state TEXT, color TEXT, odor TEXT,
  substance_group TEXT, cbrn_category TEXT NOT NULL, subcategory TEXT, un_number TEXT, ghs TEXT, signal_word TEXT, h TEXT, p TEXT,
  vapor_pressure TEXT, density TEXT, water_solubility TEXT, melting_point TEXT, boiling_point TEXT, fire_info TEXT,
  lel_vol REAL, uel_vol REAL, ie_ev REAL, ims_sim INTEGER DEFAULT 0, methods TEXT, devices TEXT,
  source_id TEXT REFERENCES sources(id), quality TEXT DEFAULT 'unverified', last_checked TEXT, notes TEXT, traits TEXT, response TEXT, gestis_zvg TEXT);
CREATE TABLE IF NOT EXISTS radionuclides (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, element TEXT, z INTEGER, a INTEGER, half_life TEXT, half_life_s REAL, decay TEXT, radiation TEXT, gamma_kev TEXT,
  applications TEXT, occurrence TEXT, measurability TEXT, cbrn_category TEXT, source_id TEXT REFERENCES sources(id), quality TEXT DEFAULT 'unverified', last_checked TEXT, notes TEXT, response TEXT);
CREATE TABLE IF NOT EXISTS biological_agents (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, kind TEXT, disease TEXT, properties TEXT, transmission TEXT, environmental_stability TEXT, detection TEXT,
  lab_relevance TEXT, risk_group TEXT, cbrn_category TEXT DEFAULT 'B', source_id TEXT REFERENCES sources(id), quality TEXT DEFAULT 'unverified', last_checked TEXT, notes TEXT, response TEXT);
CREATE TABLE IF NOT EXISTS measurement_devices (id TEXT PRIMARY KEY, short TEXT, name TEXT, kind TEXT, description TEXT, unit TEXT, source_id TEXT);
CREATE TABLE IF NOT EXISTS measurement_methods (id TEXT PRIMARY KEY, name TEXT, description TEXT);
CREATE TABLE IF NOT EXISTS test_tubes (id TEXT PRIMARY KEY, manufacturer TEXT, product TEXT, tube_type TEXT, analyte TEXT, cas TEXT, range_text TEXT, unit TEXT, application TEXT, storage_status TEXT, lot TEXT, expiry TEXT);
CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT, role TEXT, callsign TEXT);
CREATE TABLE IF NOT EXISTS vehicles (id TEXT PRIMARY KEY, name TEXT, status TEXT, link TEXT, online INTEGER, lat REAL, lon REAL, heading REAL, speed REAL, gps_fix INTEGER, power TEXT);
CREATE TABLE IF NOT EXISTS crew (id TEXT PRIMARY KEY, vehicle_id TEXT, role TEXT, name TEXT);
CREATE TABLE IF NOT EXISTS scenarios (id TEXT PRIMARY KEY, name TEXT, category TEXT, ref_type TEXT, ref_id TEXT, radius_m REAL, devices TEXT, weather TEXT, peak REAL, unit TEXT);
CREATE TABLE IF NOT EXISTS missions (
  id TEXT PRIMARY KEY, vehicle_id TEXT, sector TEXT, priority TEXT, profile TEXT, status TEXT, created_by TEXT, created_at TEXT, updated_at TEXT,
  started_at TEXT, ended_at TEXT, notes TEXT);
CREATE TABLE IF NOT EXISTS measurements (
  id TEXT PRIMARY KEY, seq INTEGER, ts TEXT, lat REAL, lon REAL, vehicle_id TEXT, mission_id TEXT, device TEXT, value REAL, unit TEXT, channels TEXT,
  substance_id TEXT, candidates TEXT, status TEXT, level TEXT, headline TEXT, remark TEXT, data_source TEXT DEFAULT 'SIMULATED', run_id TEXT);
CREATE INDEX IF NOT EXISTS ix_meas_ts ON measurements(ts);
CREATE TABLE IF NOT EXISTS samples (
  id TEXT PRIMARY KEY, ts TEXT, lat REAL, lon REAL, kind TEXT, description TEXT, color TEXT, consistency TEXT, odor TEXT, turbidity TEXT,
  readings TEXT, weather TEXT, location TEXT, taken_by TEXT, mission_id TEXT, vehicle_id TEXT, transport_status TEXT, lab_status TEXT,
  onsite_assessment TEXT, lab_result TEXT, truth_ref TEXT, updated_at TEXT, analysis TEXT);
CREATE TABLE IF NOT EXISTS sample_events (id INTEGER PRIMARY KEY AUTOINCREMENT, sample_id TEXT, ts TEXT, status TEXT, note TEXT, by_user TEXT);
CREATE TABLE IF NOT EXISTS weather_records (id INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT, temperature REAL, humidity REAL, pressure REAL, wind_speed REAL, wind_from REAL, cloud_okta REAL, precipitation REAL, data_source TEXT DEFAULT 'SIMULATED');
CREATE TABLE IF NOT EXISTS alarms (id TEXT PRIMARY KEY, ts TEXT, source TEXT, lat REAL, lon REAL, category TEXT, status TEXT, description TEXT, vehicle_id TEXT, measurement_id TEXT);
CREATE TABLE IF NOT EXISTS reports (id TEXT PRIMARY KEY, mission_id TEXT, created_at TEXT, created_by TEXT, data TEXT);
CREATE TABLE IF NOT EXISTS audit_log (id INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT, user_id TEXT, action TEXT, entity TEXT, entity_id TEXT, detail TEXT);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, vehicle_id TEXT, name TEXT, funktion TEXT, created_at TEXT, last_seen TEXT);
CREATE INDEX IF NOT EXISTS ix_meas_veh ON measurements(vehicle_id);
CREATE TABLE IF NOT EXISTS incidents (id TEXT PRIMARY KEY, name TEXT, status TEXT, created_at TEXT, created_by TEXT, ended_at TEXT, location_text TEXT, report TEXT, category TEXT, ref_type TEXT, ref_id TEXT, known INTEGER DEFAULT 0, amount TEXT, radius_m REAL, peak REAL, lat REAL, lon REAL);
CREATE TABLE IF NOT EXISTS incident_crew (incident_id TEXT, name TEXT, funktion TEXT, vehicle_id TEXT, since TEXT, PRIMARY KEY (incident_id, name, funktion, vehicle_id));
CREATE TABLE IF NOT EXISTS runs (id TEXT PRIMARY KEY, vehicle_id TEXT, name TEXT, started_at TEXT, ended_at TEXT, started_by TEXT, distance_m REAL DEFAULT 0, points INTEGER DEFAULT 0, max_dose REAL, max_pid REAL, source TEXT, mission_id TEXT);
`;
function setupSchema() {
  db.exec(SCHEMA);
  for (const [t, c] of [["substances", "traits"], ["substances", "response"], ["substances", "gestis_zvg"], ["radionuclides", "response"], ["biological_agents", "response"], ["measurements", "run_id"], ["samples", "analysis"], ["runs", "start_lat"], ["runs", "start_lon"], ["runs", "incident_id"], ["measurements", "incident_id"], ["reports", "incident_id"]]) {
    const cols = db.prepare(`PRAGMA table_info(${t})`).all().map((x) => x.name);
    if (!cols.includes(c)) db.exec(`ALTER TABLE ${t} ADD COLUMN ${c} TEXT`);
  }
}
var JSON_COLS = {
  substances: ["synonyms", "ghs", "h", "p", "methods", "devices", "traits", "response"],
  radionuclides: ["radiation", "gamma_kev", "response"],
  biological_agents: ["response"],
  measurements: ["channels", "candidates"],
  samples: ["readings", "weather", "lab_result", "truth_ref", "analysis"],
  scenarios: ["devices"],
  reports: ["data"]
};
var colCache = /* @__PURE__ */ new Map();
var columns = (t) => {
  if (!colCache.has(t)) colCache.set(t, db.prepare(`PRAGMA table_info(${t})`).all().map((c) => c.name));
  return colCache.get(t);
};
function parse(table, row) {
  if (!row) return row;
  const o = { ...row };
  for (const c of JSON_COLS[table] ?? []) if (typeof o[c] === "string") {
    try {
      o[c] = JSON.parse(o[c]);
    } catch {
    }
  }
  return o;
}
var ser = (table, k, v) => v !== null && typeof v === "object" ? JSON.stringify(v) : (JSON_COLS[table] ?? []).includes(k) && v !== null && v !== void 0 && typeof v !== "string" ? JSON.stringify(v) : v ?? null;
var ok = (v) => typeof v === "boolean" ? v ? 1 : 0 : v;
function list(table, where = "", params = [], order = "") {
  return db.prepare(`SELECT * FROM ${table} ${where} ${order}`).all(...params).map((r) => parse(table, r));
}
function get(table, id, key = "id") {
  return parse(table, db.prepare(`SELECT * FROM ${table} WHERE ${key} = ?`).get(id));
}
function insert(table, obj, replace = false) {
  const cols = columns(table).filter((c) => obj[c] !== void 0);
  db.prepare(`INSERT ${replace ? "OR REPLACE" : ""} INTO ${table} (${cols.join(",")}) VALUES (${cols.map(() => "?").join(",")})`).run(...cols.map((c) => ok(ser(table, c, obj[c]))));
}
function update(table, id, obj) {
  const cols = columns(table).filter((c) => c !== "id" && obj[c] !== void 0);
  if (!cols.length) return;
  db.prepare(`UPDATE ${table} SET ${cols.map((c) => `${c} = ?`).join(",")} WHERE id = ?`).run(...cols.map((c) => ok(ser(table, c, obj[c]))), id);
}
var remove = (table, id) => db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
var getSetting = (k, d = null) => {
  const r = db.prepare("SELECT value FROM settings WHERE key=?").get(k);
  return r ? JSON.parse(r.value) : d;
};
var setSetting = (k, v) => {
  db.prepare("INSERT OR REPLACE INTO settings(key,value) VALUES(?,?)").run(k, JSON.stringify(v));
};
var now = () => (/* @__PURE__ */ new Date()).toISOString();
function audit(user, action, entity, entityId, detail) {
  const ts = now();
  const info = db.prepare("INSERT INTO audit_log(ts,user_id,action,entity,entity_id,detail) VALUES(?,?,?,?,?,?)").run(ts, user, action, entity, entityId, detail ? JSON.stringify(detail) : null);
  return { id: info.lastInsertRowid, ts, user_id: user, action, entity, entity_id: entityId, detail };
}

// server/config.ts
var import_node_fs2 = __toESM(require("node:fs"), 1);
var import_node_path2 = __toESM(require("node:path"), 1);

// server/paths.ts
var RES_DIR = typeof GetResourcePath === "function" && typeof GetCurrentResourceName === "function" ? GetResourcePath(GetCurrentResourceName()) : process.cwd();

// server/config.ts
var DEFAULT = {
  mapMode: "gta5",
  geo: { center: { lat: 54.3233, lon: 10.1228 }, tileUrl: "https://tile.openstreetmap.org/{z}/{x}/{y}.png", attribution: "\xA9 OpenStreetMap-Mitwirkende" },
  gta5: { center: { x: 195, y: -934 }, image: "/maps/gta5.webp", bounds: { minX: -5489, maxX: 6972, minY: -4106, maxY: 8355 } }
};
function loadConfig() {
  try {
    const j = JSON.parse(import_node_fs2.default.readFileSync(import_node_path2.default.resolve(RES_DIR, "config.json"), "utf8"));
    return { ...DEFAULT, ...j, geo: { ...DEFAULT.geo, ...j.geo }, gta5: { ...DEFAULT.gta5, ...j.gta5 } };
  } catch {
    return DEFAULT;
  }
}
var config = loadConfig();
if (process.env.MAP_MODE === "geo" || process.env.MAP_MODE === "gta5") config.mapMode = process.env.MAP_MODE;

// server/data/gestis-index.json
var gestis_index_default = {
  ammoniak: {
    zvg: "001100",
    gestis_name: "Ammoniak, wasserfrei",
    cas_match: true
  },
  chlor: {
    zvg: "007170",
    gestis_name: "Chlor",
    cas_match: true
  },
  schwefeldioxid: {
    zvg: "001020",
    gestis_name: "Schwefeldioxid",
    cas_match: true
  },
  kohlenmonoxid: {
    zvg: "001110",
    gestis_name: "Kohlenmonoxid",
    cas_match: true
  },
  kohlendioxid: {
    zvg: "001121",
    gestis_name: "Kohlendioxid, tiefkalt verfl\xFCssigt",
    cas_match: true
  },
  schwefelwasserstoff: {
    zvg: "001130",
    gestis_name: "Schwefelwasserstoff",
    cas_match: true
  },
  phosgen: {
    zvg: "001340",
    gestis_name: "Phosgen",
    cas_match: true
  },
  cyanwasserstoff: {
    zvg: "530373",
    gestis_name: "Cyanwasserstoff, w\xE4ssrige L\xF6sung",
    cas_match: true
  },
  benzol: {
    zvg: "010060",
    gestis_name: "Benzol",
    cas_match: true
  },
  toluol: {
    zvg: "010070",
    gestis_name: "Toluol",
    cas_match: true
  },
  xylol: {
    zvg: "010080",
    gestis_name: "Xylol, Isomerengemisch",
    cas_match: true
  },
  aceton: {
    zvg: "011230",
    gestis_name: "Aceton",
    cas_match: true
  },
  methanol: {
    zvg: "011240",
    gestis_name: "Methanol",
    cas_match: true
  },
  ethanol: {
    zvg: "010420",
    gestis_name: "Ethanol",
    cas_match: true
  },
  isopropanol: {
    zvg: "011190",
    gestis_name: "2-Propanol",
    cas_match: true
  },
  acetonitril: {
    zvg: "013660",
    gestis_name: "Acetonitril",
    cas_match: true
  },
  formaldehyd: {
    zvg: "010520",
    gestis_name: "Formaldehyd",
    cas_match: true
  },
  salpetersaeure: {
    zvg: "001370",
    gestis_name: "Salpeters\xE4ure",
    cas_match: true
  },
  schwefelsaeure: {
    zvg: "001160",
    gestis_name: "Schwefels\xE4ure",
    cas_match: true
  },
  salzsaeure: {
    zvg: "520030",
    gestis_name: "Salzs\xE4ure",
    cas_match: true
  },
  natriumhydroxid: {
    zvg: "001270",
    gestis_name: "Natriumhydroxid",
    cas_match: true
  },
  sarin: {
    zvg: "490140",
    gestis_name: "Sarin",
    cas_match: true
  },
  soman: {
    zvg: "570179",
    gestis_name: "Soman",
    cas_match: true
  },
  tabun: {
    zvg: "490089",
    gestis_name: "Tabun",
    cas_match: true
  },
  schwefellost: {
    zvg: "510748",
    gestis_name: "Bis(2-chlorethyl)sulfid",
    cas_match: true
  },
  stickstofflost: {
    zvg: "490230",
    gestis_name: "Tris(2-chlorethyl)amin",
    cas_match: true
  },
  lewisit: {
    zvg: "570100",
    gestis_name: "Chlorvinyldichlorarsin",
    cas_match: true
  },
  propan: {
    zvg: "010020",
    gestis_name: "Propan",
    cas_match: true
  },
  butan: {
    zvg: "010030",
    gestis_name: "Butan",
    cas_match: true
  },
  methan: {
    zvg: "010000",
    gestis_name: "Methan",
    cas_match: true
  },
  wasserstoff: {
    zvg: "535601",
    gestis_name: "Formiergas mit einem Wasserstoffanteil > 5 %",
    cas_match: true
  },
  acetylen: {
    zvg: "013570",
    gestis_name: "Acetylen",
    cas_match: true
  },
  ethylen: {
    zvg: "012710",
    gestis_name: "Ethylen",
    cas_match: true
  },
  dimethylether: {
    zvg: "025460",
    gestis_name: "Dimethylether",
    cas_match: true
  },
  stickstoff: {
    zvg: "007071",
    gestis_name: "Stickstoff, tiefkalt verfl\xFCssigt",
    cas_match: true
  },
  argon: {
    zvg: "007181",
    gestis_name: "Argon, tiefkalt verfl\xFCssigt",
    cas_match: true
  },
  helium: {
    zvg: "007021",
    gestis_name: "Helium, tiefkalt verfl\xFCssigt",
    cas_match: true
  },
  sauerstoff: {
    zvg: "007080",
    gestis_name: "Sauerstoff",
    cas_match: true
  },
  lachgas: {
    zvg: "004231",
    gestis_name: "Distickstoffmonoxid, tiefkalt verfl\xFCssigt",
    cas_match: true
  },
  stickstoffdioxid: {
    zvg: "001090",
    gestis_name: "Stickstoffdioxid",
    cas_match: true
  },
  stickstoffmonoxid: {
    zvg: "001080",
    gestis_name: "Stickstoffmonoxid",
    cas_match: true
  },
  fluorwasserstoff: {
    zvg: "001040",
    gestis_name: "Fluorwasserstoff, wasserfrei",
    cas_match: true
  },
  ethylenoxid: {
    zvg: "012000",
    gestis_name: "Ethylenoxid",
    cas_match: true
  },
  vinylchlorid: {
    zvg: "013290",
    gestis_name: "Vinylchlorid",
    cas_match: true
  },
  phosphin: {
    zvg: "003530",
    gestis_name: "Phosphin",
    cas_match: true
  },
  arsin: {
    zvg: "004900",
    gestis_name: "Arsenwasserstoff",
    cas_match: true
  },
  r134a: {
    zvg: "491009",
    gestis_name: "1,1,1,2-Tetrafluorethan",
    cas_match: true
  },
  benzin: {
    zvg: "531390",
    gestis_name: "Ottokraftstoff",
    cas_match: true
  },
  diesel: {
    zvg: "536303",
    gestis_name: "Dieselkraftstoff",
    cas_match: true
  },
  heizoel: {
    zvg: "536302",
    gestis_name: "Heiz\xF6l EL",
    cas_match: true
  },
  kerosin: {
    zvg: "090150",
    gestis_name: "Kerosin",
    cas_match: true
  },
  nhexan: {
    zvg: "510789",
    gestis_name: "Hexan",
    cas_match: true
  },
  cyclohexan: {
    zvg: "013790",
    gestis_name: "Cyclohexan",
    cas_match: true
  },
  styrol: {
    zvg: "010110",
    gestis_name: "Styrol",
    cas_match: true
  },
  ethylacetat: {
    zvg: "012040",
    gestis_name: "Ethylacetat",
    cas_match: true
  },
  butylacetat: {
    zvg: "013320",
    gestis_name: "Butylacetat",
    cas_match: true
  },
  butanon: {
    zvg: "013330",
    gestis_name: "Butanon",
    cas_match: true
  },
  diethylether: {
    zvg: "013600",
    gestis_name: "Diethylether",
    cas_match: true
  },
  thf: {
    zvg: "025400",
    gestis_name: "Tetrahydrofuran",
    cas_match: true
  },
  propylenoxid: {
    zvg: "012010",
    gestis_name: "Propylenoxid",
    cas_match: true
  },
  dichlormethan: {
    zvg: "012630",
    gestis_name: "Dichlormethan",
    cas_match: true
  },
  chloroform: {
    zvg: "012870",
    gestis_name: "Trichlormethan",
    cas_match: true
  },
  tetrachlorethen: {
    zvg: "013680",
    gestis_name: "Tetrachlorethen",
    cas_match: true
  },
  trichlorethen: {
    zvg: "010720",
    gestis_name: "Trichlorethylen",
    cas_match: true
  },
  kohlenstoffdisulfid: {
    zvg: "001430",
    gestis_name: "Kohlendisulfid",
    cas_match: true
  },
  pyridin: {
    zvg: "013850",
    gestis_name: "Pyridin",
    cas_match: true
  },
  ethylenglykol: {
    zvg: "012060",
    gestis_name: "Ethylenglykol",
    cas_match: true
  },
  phenol: {
    zvg: "010430",
    gestis_name: "Phenol",
    cas_match: true
  },
  anilin: {
    zvg: "011860",
    gestis_name: "Anilin",
    cas_match: true
  },
  nitrobenzol: {
    zvg: "015890",
    gestis_name: "Nitrobenzol",
    cas_match: true
  },
  acrylnitril: {
    zvg: "011410",
    gestis_name: "Acrylnitril",
    cas_match: true
  },
  acrolein: {
    zvg: "013480",
    gestis_name: "Acrylaldehyd",
    cas_match: true
  },
  hydrazin: {
    zvg: "002010",
    gestis_name: "Hydrazin",
    cas_match: true
  },
  kaliumcyanid: {
    zvg: "001970",
    gestis_name: "Kaliumcyanid",
    cas_match: true
  },
  natriumcyanid: {
    zvg: "002420",
    gestis_name: "Natriumcyanid",
    cas_match: true
  },
  quecksilber: {
    zvg: "008490",
    gestis_name: "Quecksilber",
    cas_match: true
  },
  essigsaeure: {
    zvg: "011400",
    gestis_name: "Essigs\xE4ure",
    cas_match: true
  },
  ameisensaeure: {
    zvg: "011490",
    gestis_name: "Ameisens\xE4ure",
    cas_match: true
  },
  phosphorsaeure: {
    zvg: "001800",
    gestis_name: "Phosphors\xE4ure",
    cas_match: true
  },
  kaliumhydroxid: {
    zvg: "001420",
    gestis_name: "Kaliumhydroxid",
    cas_match: true
  },
  ammoniaklosung: {
    zvg: "001750",
    gestis_name: "Ammoniak, w\xE4ssrige L\xF6sung",
    cas_match: true
  },
  natriumhypochlorit: {
    zvg: "001410",
    gestis_name: "Natriumhypochlorit, w\xE4ssrige L\xF6sung mit Anteilen an aktivem Chlor",
    cas_match: true
  },
  wasserstoffperoxid: {
    zvg: "002430",
    gestis_name: "Wasserstoffperoxid ab 60 %",
    cas_match: true
  },
  ammoniumnitrat: {
    zvg: "003750",
    gestis_name: "Ammoniumnitrat",
    cas_match: true
  },
  natriumchlorat: {
    zvg: "003910",
    gestis_name: "Natriumchlorat",
    cas_match: true
  },
  kaliumpermanganat: {
    zvg: "004070",
    gestis_name: "Kaliumpermanganat",
    cas_match: true
  },
  brom: {
    zvg: "001000",
    gestis_name: "Brom",
    cas_match: true
  },
  calciumcarbid: {
    zvg: "001980",
    gestis_name: "Calciumcarbid",
    cas_match: true
  },
  natrium: {
    zvg: "008080",
    gestis_name: "Natrium",
    cas_match: true
  },
  calciumoxid: {
    zvg: "001200",
    gestis_name: "Calciumoxid",
    cas_match: true
  },
  schwefel: {
    zvg: "008130",
    gestis_name: "Schwefel",
    cas_match: true
  }
};

// server/data/substances.ts
var G = "Gas";
var L = "Fl\xFCssigkeit";
var S = "Feststoff";
var std = (d, m) => ({ devices: d, methods: m });
var substances = [
  {
    id: "ammoniak",
    name: "Ammoniak",
    synonyms: ["Ammoniak, wasserfrei", "Azan", "NH3"],
    cas: "7664-41-7",
    formula: "NH\u2083",
    molar_mass: 17.03,
    state: G,
    color: "farblos",
    odor: "stechend",
    substance_group: "Anorganisches Gas / Base",
    cbrn_category: "C",
    subcategory: "TIC",
    un_number: "1005",
    ghs: ["GHS02", "GHS04", "GHS05", "GHS06", "GHS09"],
    signal_word: "Gefahr",
    h: ["H221", "H280", "H314", "H331", "H400"],
    vapor_pressure: "ca. 8570 hPa (20 \xB0C)",
    density: "0,77 kg/m\xB3 (Gas, 0 \xB0C)",
    water_solubility: "ca. 530 g/L (20 \xB0C)",
    melting_point: "\u221277,7 \xB0C",
    boiling_point: "\u221233,3 \xB0C",
    fire_info: "Entz\xFCndbares Gas; Z\xFCndbereich ca. 15\u201330 Vol.-%",
    lel_vol: 15,
    uel_vol: 30,
    ie_ev: 10.07,
    ims_sim: true,
    ...std(["IMS", "PID", "Pr\xFCfr\xF6hrchen"], ["IMS-Screening", "PID-Screening", "Pr\xFCfr\xF6hrchen", "Laboranalytik"]),
    source_id: "gestis"
  },
  {
    id: "chlor",
    name: "Chlor",
    synonyms: ["Dichlor", "Cl2"],
    cas: "7782-50-5",
    formula: "Cl\u2082",
    molar_mass: 70.9,
    state: G,
    color: "gelbgr\xFCn",
    odor: "stechend, erstickend",
    substance_group: "Halogen / Oxidationsmittel",
    cbrn_category: "C",
    subcategory: "TIC",
    un_number: "1017",
    ghs: ["GHS03", "GHS04", "GHS06", "GHS09"],
    signal_word: "Gefahr",
    h: ["H270", "H280", "H315", "H319", "H330", "H335", "H400"],
    vapor_pressure: "ca. 6800 hPa (20 \xB0C)",
    density: "3,2 kg/m\xB3 (Gas, 0 \xB0C; ca. 2,5-fach schwerer als Luft)",
    water_solubility: "ca. 7 g/L (20 \xB0C)",
    melting_point: "\u2212101 \xB0C",
    boiling_point: "\u221234 \xB0C",
    fire_info: "Nicht brennbar; oxidierend, kann Br\xE4nde verst\xE4rken",
    lel_vol: null,
    uel_vol: null,
    ie_ev: 11.48,
    ims_sim: true,
    ...std(["IMS", "Pr\xFCfr\xF6hrchen"], ["IMS-Screening", "Pr\xFCfr\xF6hrchen", "Laboranalytik"]),
    source_id: "gestis",
    notes: "IE 11,48 eV liegt \xFCber der Energie einer 10,6-eV-PID-Lampe: PID-Ansprechen nicht zu erwarten."
  },
  {
    id: "schwefeldioxid",
    name: "Schwefeldioxid",
    synonyms: ["Schwefel(IV)-oxid", "SO2"],
    cas: "7446-09-5",
    formula: "SO\u2082",
    molar_mass: 64.07,
    state: G,
    color: "farblos",
    odor: "stechend",
    substance_group: "Anorganisches Gas / S\xE4urebildner",
    cbrn_category: "C",
    subcategory: "TIC",
    un_number: "1079",
    ghs: ["GHS04", "GHS05", "GHS06"],
    signal_word: "Gefahr",
    h: ["H280", "H314", "H331"],
    vapor_pressure: "ca. 3300 hPa (20 \xB0C)",
    density: "ca. 2,9 kg/m\xB3 (Gas, 0 \xB0C)",
    water_solubility: "ca. 94 g/L (20 \xB0C)",
    melting_point: "\u221275,5 \xB0C",
    boiling_point: "\u221210 \xB0C",
    fire_info: "Nicht brennbar",
    lel_vol: null,
    uel_vol: null,
    ie_ev: 12.3,
    ims_sim: false,
    ...std(["MGMG", "Pr\xFCfr\xF6hrchen"], ["Elektrochemischer Sensor", "Pr\xFCfr\xF6hrchen", "Laboranalytik"]),
    source_id: "gestis"
  },
  {
    id: "kohlenmonoxid",
    name: "Kohlenmonoxid",
    synonyms: ["Kohlenoxid", "CO"],
    cas: "630-08-0",
    formula: "CO",
    molar_mass: 28.01,
    state: G,
    color: "farblos",
    odor: "geruchlos",
    substance_group: "Anorganisches Gas / Erstickungsgift",
    cbrn_category: "C",
    subcategory: "TIC",
    un_number: "1016",
    ghs: ["GHS02", "GHS04", "GHS06", "GHS08"],
    signal_word: "Gefahr",
    h: ["H220", "H280", "H331", "H360D", "H372"],
    vapor_pressure: null,
    density: "ca. 1,14 kg/m\xB3 (Gas, 20 \xB0C)",
    water_solubility: "gering (ca. 0,03 g/L, 20 \xB0C)",
    melting_point: "\u2212205 \xB0C",
    boiling_point: "\u2212191,5 \xB0C",
    fire_info: "Extrem entz\xFCndbares Gas; Z\xFCndbereich ca. 11\u201374 Vol.-%",
    lel_vol: 10.9,
    uel_vol: 74,
    ie_ev: 14.01,
    ims_sim: false,
    ...std(["MGMG", "Pr\xFCfr\xF6hrchen"], ["Elektrochemischer Sensor", "Pr\xFCfr\xF6hrchen"]),
    source_id: "gestis"
  },
  {
    id: "kohlendioxid",
    name: "Kohlendioxid",
    synonyms: ["Kohlenstoffdioxid", "CO2"],
    cas: "124-38-9",
    formula: "CO\u2082",
    molar_mass: 44.01,
    state: G,
    color: "farblos",
    odor: "geruchlos",
    substance_group: "Anorganisches Gas / Erstickungsgas",
    cbrn_category: "C",
    subcategory: "TIC",
    un_number: "1013",
    ghs: ["GHS04"],
    signal_word: "Achtung",
    h: ["H280"],
    vapor_pressure: null,
    density: "ca. 1,98 kg/m\xB3 (Gas, 0 \xB0C)",
    water_solubility: "ca. 1,7 g/L (20 \xB0C, 1 bar)",
    melting_point: null,
    boiling_point: "Sublimation bei \u221278,5 \xB0C",
    fire_info: "Nicht brennbar",
    lel_vol: null,
    uel_vol: null,
    ie_ev: 13.77,
    ims_sim: false,
    ...std(["MGMG", "Pr\xFCfr\xF6hrchen"], ["NDIR-Sensor", "Pr\xFCfr\xF6hrchen"]),
    source_id: "gestis"
  },
  {
    id: "schwefelwasserstoff",
    name: "Schwefelwasserstoff",
    synonyms: ["Hydrogensulfid", "H2S"],
    cas: "7783-06-4",
    formula: "H\u2082S",
    molar_mass: 34.08,
    state: G,
    color: "farblos",
    odor: "faule Eier (Geruchsgew\xF6hnung/Bet\xE4ubung bei hohen Konzentrationen)",
    substance_group: "Anorganisches Gas / Atemgift",
    cbrn_category: "C",
    subcategory: "TIC",
    un_number: "1053",
    ghs: ["GHS02", "GHS04", "GHS06", "GHS09"],
    signal_word: "Gefahr",
    h: ["H220", "H280", "H330", "H400"],
    vapor_pressure: "ca. 18 200 hPa (20 \xB0C)",
    density: "ca. 1,5 kg/m\xB3 (Gas, 0 \xB0C)",
    water_solubility: "ca. 4 g/L (20 \xB0C)",
    melting_point: "\u221285,5 \xB0C",
    boiling_point: "\u221260,3 \xB0C",
    fire_info: "Extrem entz\xFCndbares Gas; Z\xFCndbereich ca. 4,3\u201345,5 Vol.-%",
    lel_vol: 4.3,
    uel_vol: 45.5,
    ie_ev: 10.45,
    ims_sim: false,
    ...std(["MGMG", "PID", "Pr\xFCfr\xF6hrchen"], ["Elektrochemischer Sensor", "Pr\xFCfr\xF6hrchen", "PID-Screening"]),
    source_id: "gestis"
  },
  {
    id: "phosgen",
    name: "Phosgen",
    synonyms: ["Carbonyldichlorid", "Kohlens\xE4uredichlorid", "COCl2"],
    cas: "75-44-5",
    formula: "COCl\u2082",
    molar_mass: 98.92,
    state: G,
    color: "farblos",
    odor: "schwach, nach feuchtem Heu / faulenden Fr\xFCchten",
    substance_group: "S\xE4urechlorid / Lungenreizstoff",
    cbrn_category: "C",
    subcategory: "TIC",
    un_number: "1076",
    ghs: ["GHS04", "GHS05", "GHS06"],
    signal_word: "Gefahr",
    h: ["H280", "H314", "H330"],
    vapor_pressure: "ca. 1600 hPa (20 \xB0C)",
    density: "Gas ca. 3,4-fach schwerer als Luft",
    water_solubility: "reagiert (Hydrolyse)",
    melting_point: "\u2212128 \xB0C",
    boiling_point: "8,3 \xB0C",
    fire_info: "Nicht brennbar",
    lel_vol: null,
    uel_vol: null,
    ie_ev: 11.2,
    ims_sim: true,
    ...std(["IMS", "Pr\xFCfr\xF6hrchen"], ["IMS-Screening", "Pr\xFCfr\xF6hrchen", "Laboranalytik"]),
    source_id: "gestis",
    notes: "Auch als Industriechemikalie (TIC) relevant; Chemiewaffen\xFCbereinkommen: Liste 3."
  },
  {
    id: "cyanwasserstoff",
    name: "Cyanwasserstoff",
    synonyms: ["Blaus\xE4ure", "Formonitril", "HCN"],
    cas: "74-90-8",
    formula: "HCN",
    molar_mass: 27.03,
    state: L,
    color: "farblos",
    odor: "bittermandelartig (nicht von allen Personen wahrnehmbar)",
    substance_group: "Anorganische Cyanverbindung / Zellgift",
    cbrn_category: "C",
    subcategory: "TIC",
    un_number: "1051",
    ghs: ["GHS02", "GHS06", "GHS09"],
    signal_word: "Gefahr",
    h: ["H225", "H300", "H310", "H330", "H410", "EUH032"],
    vapor_pressure: "ca. 830 hPa (20 \xB0C)",
    density: "ca. 0,69 g/cm\xB3 (20 \xB0C)",
    water_solubility: "mischbar",
    melting_point: "\u221213,4 \xB0C",
    boiling_point: "25,6 \xB0C",
    fire_info: "Flammpunkt ca. \u221218 \xB0C; leicht entz\xFCndbar",
    lel_vol: null,
    uel_vol: null,
    ie_ev: 13.6,
    ims_sim: true,
    ...std(["IMS", "Pr\xFCfr\xF6hrchen"], ["IMS-Screening", "Pr\xFCfr\xF6hrchen", "Laboranalytik"]),
    source_id: "gestis"
  },
  {
    id: "benzol",
    name: "Benzol",
    synonyms: ["Benzen", "C6H6"],
    cas: "71-43-2",
    formula: "C\u2086H\u2086",
    molar_mass: 78.11,
    state: L,
    color: "farblos",
    odor: "aromatisch",
    substance_group: "Aromatischer Kohlenwasserstoff / VOC",
    cbrn_category: "C",
    subcategory: "TIC",
    un_number: "1114",
    ghs: ["GHS02", "GHS07", "GHS08"],
    signal_word: "Gefahr",
    h: ["H225", "H304", "H315", "H319", "H340", "H350", "H372"],
    vapor_pressure: "ca. 100 hPa (20 \xB0C)",
    density: "0,88 g/cm\xB3 (20 \xB0C)",
    water_solubility: "ca. 1,8 g/L (20 \xB0C)",
    melting_point: "5,5 \xB0C",
    boiling_point: "80,1 \xB0C",
    fire_info: "Flammpunkt ca. \u221211 \xB0C; Z\xFCndbereich ca. 1,2\u20138 Vol.-%",
    lel_vol: 1.2,
    uel_vol: 8,
    ie_ev: 9.24,
    ims_sim: false,
    ...std(["PID", "Pr\xFCfr\xF6hrchen", "MGMG"], ["PID-Screening", "Pr\xFCfr\xF6hrchen", "Laboranalytik"]),
    source_id: "gestis"
  },
  {
    id: "toluol",
    name: "Toluol",
    synonyms: ["Methylbenzol", "Toluen"],
    cas: "108-88-3",
    formula: "C\u2087H\u2088",
    molar_mass: 92.14,
    state: L,
    color: "farblos",
    odor: "aromatisch",
    substance_group: "Aromatischer Kohlenwasserstoff / L\xF6semittel",
    cbrn_category: "C",
    subcategory: "TIC",
    un_number: "1294",
    ghs: ["GHS02", "GHS07", "GHS08"],
    signal_word: "Gefahr",
    h: ["H225", "H304", "H315", "H336", "H361d", "H373"],
    vapor_pressure: "ca. 29 hPa (20 \xB0C)",
    density: "0,87 g/cm\xB3 (20 \xB0C)",
    water_solubility: "ca. 0,5 g/L (20 \xB0C)",
    melting_point: "\u221295 \xB0C",
    boiling_point: "110,6 \xB0C",
    fire_info: "Flammpunkt ca. 6 \xB0C; Untere Explosionsgrenze ca. 1,1 Vol.-%",
    lel_vol: 1.1,
    uel_vol: null,
    ie_ev: 8.83,
    ims_sim: false,
    ...std(["PID", "Pr\xFCfr\xF6hrchen", "MGMG"], ["PID-Screening", "Pr\xFCfr\xF6hrchen", "Laboranalytik"]),
    source_id: "gestis"
  },
  {
    id: "xylol",
    name: "Xylol (Isomerengemisch)",
    synonyms: ["Xylole", "Dimethylbenzol"],
    cas: "1330-20-7",
    formula: "C\u2088H\u2081\u2080",
    molar_mass: 106.17,
    state: L,
    color: "farblos",
    odor: "aromatisch",
    substance_group: "Aromatischer Kohlenwasserstoff / L\xF6semittel",
    cbrn_category: "C",
    subcategory: "TIC",
    un_number: "1307",
    ghs: ["GHS02", "GHS07", "GHS08"],
    signal_word: "Gefahr",
    h: ["H226", "H304", "H312", "H315", "H319", "H332", "H335", "H373"],
    vapor_pressure: "ca. 7\u20139 hPa (20 \xB0C, isomerabh\xE4ngig)",
    density: "ca. 0,86 g/cm\xB3 (20 \xB0C)",
    water_solubility: "gering (ca. 0,2 g/L)",
    melting_point: null,
    boiling_point: "ca. 137\u2013144 \xB0C",
    fire_info: "Flammpunkt ca. 25\u201330 \xB0C (isomerabh\xE4ngig); Untere Explosionsgrenze ca. 1 Vol.-%",
    lel_vol: 1,
    uel_vol: null,
    ie_ev: 8.56,
    ims_sim: false,
    ...std(["PID", "Pr\xFCfr\xF6hrchen", "MGMG"], ["PID-Screening", "Pr\xFCfr\xF6hrchen", "Laboranalytik"]),
    source_id: "gestis",
    notes: "Ionisierungsenergie hier f\xFCr o-Xylol (NIOSH)."
  },
  {
    id: "aceton",
    name: "Aceton",
    synonyms: ["Propanon", "Dimethylketon"],
    cas: "67-64-1",
    formula: "C\u2083H\u2086O",
    molar_mass: 58.08,
    state: L,
    color: "farblos",
    odor: "charakteristisch, s\xFC\xDFlich-fruchtig",
    substance_group: "Keton / L\xF6semittel",
    cbrn_category: "C",
    subcategory: "TIC",
    un_number: "1090",
    ghs: ["GHS02", "GHS07"],
    signal_word: "Gefahr",
    h: ["H225", "H319", "H336", "EUH066"],
    vapor_pressure: "ca. 233 hPa (20 \xB0C)",
    density: "0,79 g/cm\xB3 (20 \xB0C)",
    water_solubility: "mischbar",
    melting_point: "\u221295 \xB0C",
    boiling_point: "56 \xB0C",
    fire_info: "Flammpunkt ca. \u221220 \xB0C; Z\xFCndbereich ca. 2,5\u201314 Vol.-%",
    lel_vol: 2.5,
    uel_vol: 14,
    ie_ev: 9.69,
    ims_sim: false,
    ...std(["PID", "MGMG"], ["PID-Screening", "Laboranalytik"]),
    source_id: "gestis"
  },
  {
    id: "methanol",
    name: "Methanol",
    synonyms: ["Methylalkohol", "Carbinol"],
    cas: "67-56-1",
    formula: "CH\u2084O",
    molar_mass: 32.04,
    state: L,
    color: "farblos",
    odor: "alkoholisch",
    substance_group: "Alkohol / L\xF6semittel",
    cbrn_category: "C",
    subcategory: "TIC",
    un_number: "1230",
    ghs: ["GHS02", "GHS06", "GHS08"],
    signal_word: "Gefahr",
    h: ["H225", "H301", "H311", "H331", "H370"],
    vapor_pressure: "ca. 128 hPa (20 \xB0C)",
    density: "0,79 g/cm\xB3 (20 \xB0C)",
    water_solubility: "mischbar",
    melting_point: "\u221298 \xB0C",
    boiling_point: "64,7 \xB0C",
    fire_info: "Flammpunkt ca. 9\u201310 \xB0C; leicht entz\xFCndbar",
    lel_vol: 6,
    uel_vol: null,
    ie_ev: 10.85,
    ims_sim: false,
    ...std(["PID", "MGMG"], ["PID-Screening (geringes Ansprechen bei 10,6 eV)", "Laboranalytik"]),
    source_id: "gestis"
  },
  {
    id: "ethanol",
    name: "Ethanol",
    synonyms: ["Ethylalkohol", "Alkohol"],
    cas: "64-17-5",
    formula: "C\u2082H\u2086O",
    molar_mass: 46.07,
    state: L,
    color: "farblos",
    odor: "alkoholisch",
    substance_group: "Alkohol / L\xF6semittel",
    cbrn_category: "C",
    subcategory: "TIC",
    un_number: "1170",
    ghs: ["GHS02", "GHS07"],
    signal_word: "Gefahr",
    h: ["H225", "H319"],
    vapor_pressure: "ca. 59 hPa (20 \xB0C)",
    density: "0,79 g/cm\xB3 (20 \xB0C)",
    water_solubility: "mischbar",
    melting_point: "\u2212114 \xB0C",
    boiling_point: "78 \xB0C",
    fire_info: "Flammpunkt ca. 12 \xB0C; Z\xFCndbereich ca. 3,1\u201327,7 Vol.-%",
    lel_vol: 3.1,
    uel_vol: 27.7,
    ie_ev: 10.47,
    ims_sim: false,
    ...std(["PID", "MGMG"], ["PID-Screening", "Laboranalytik"]),
    source_id: "gestis"
  },
  {
    id: "isopropanol",
    name: "Isopropanol",
    synonyms: ["2-Propanol", "Propan-2-ol", "IPA"],
    cas: "67-63-0",
    formula: "C\u2083H\u2088O",
    molar_mass: 60.1,
    state: L,
    color: "farblos",
    odor: "alkoholisch",
    substance_group: "Alkohol / L\xF6semittel",
    cbrn_category: "C",
    subcategory: "TIC",
    un_number: "1219",
    ghs: ["GHS02", "GHS07"],
    signal_word: "Gefahr",
    h: ["H225", "H319", "H336"],
    vapor_pressure: "ca. 43 hPa (20 \xB0C)",
    density: "0,785 g/cm\xB3 (20 \xB0C)",
    water_solubility: "mischbar",
    melting_point: "\u221289,5 \xB0C",
    boiling_point: "82,5 \xB0C",
    fire_info: "Flammpunkt ca. 12 \xB0C; Untere Explosionsgrenze ca. 2 Vol.-%",
    lel_vol: 2,
    uel_vol: null,
    ie_ev: 10.22,
    ims_sim: false,
    ...std(["PID", "MGMG"], ["PID-Screening", "Laboranalytik"]),
    source_id: "gestis"
  },
  {
    id: "acetonitril",
    name: "Acetonitril",
    synonyms: ["Methylcyanid", "Ethannitril"],
    cas: "75-05-8",
    formula: "C\u2082H\u2083N",
    molar_mass: 41.05,
    state: L,
    color: "farblos",
    odor: "\xE4therisch, leicht s\xFC\xDFlich",
    substance_group: "Nitril / L\xF6semittel",
    cbrn_category: "C",
    subcategory: "TIC",
    un_number: "1648",
    ghs: ["GHS02", "GHS07"],
    signal_word: "Gefahr",
    h: ["H225", "H302", "H312", "H319", "H332"],
    vapor_pressure: "ca. 97 hPa (20 \xB0C)",
    density: "0,786 g/cm\xB3 (20 \xB0C)",
    water_solubility: "mischbar",
    melting_point: "\u221245 \xB0C",
    boiling_point: "81,6 \xB0C",
    fire_info: "Flammpunkt ca. 2 \xB0C; leicht entz\xFCndbar",
    lel_vol: null,
    uel_vol: null,
    ie_ev: 12.19,
    ims_sim: false,
    ...std(["MGMG"], ["Laboranalytik"]),
    source_id: "gestis",
    notes: "IE 12,19 eV: PID mit 10,6-eV-Lampe spricht nicht an."
  },
  {
    id: "formaldehyd",
    name: "Formaldehyd",
    synonyms: ["Methanal", "Formalin (w\xE4ssrige L\xF6sung)"],
    cas: "50-00-0",
    formula: "CH\u2082O",
    molar_mass: 30.03,
    state: G,
    color: "farblos",
    odor: "stechend",
    substance_group: "Aldehyd / Reizstoff",
    cbrn_category: "C",
    subcategory: "TIC",
    un_number: "1198 / 2209 (L\xF6sungen)",
    ghs: ["GHS05", "GHS06", "GHS08"],
    signal_word: "Gefahr",
    h: ["H301", "H311", "H314", "H317", "H331", "H341", "H350", "EUH071"],
    vapor_pressure: null,
    density: null,
    water_solubility: "sehr gut l\xF6slich",
    melting_point: "\u221292 \xB0C",
    boiling_point: "\u221219 \xB0C",
    fire_info: "Gas entz\xFCndbar; Z\xFCndbereich ca. 7\u201373 Vol.-%",
    lel_vol: 7,
    uel_vol: 73,
    ie_ev: 10.88,
    ims_sim: false,
    ...std(["Pr\xFCfr\xF6hrchen"], ["Pr\xFCfr\xF6hrchen", "Laboranalytik"]),
    source_id: "gestis"
  },
  {
    id: "salpetersaeure",
    name: "Salpeters\xE4ure",
    synonyms: ["Scheidewasser (histor.)", "HNO3"],
    cas: "7697-37-2",
    formula: "HNO\u2083",
    molar_mass: 63.01,
    state: L,
    color: "farblos bis gelblich",
    odor: "stechend",
    substance_group: "Anorganische S\xE4ure / Oxidationsmittel",
    cbrn_category: "C",
    subcategory: "TIC",
    un_number: "2031",
    ghs: ["GHS03", "GHS05", "GHS06"],
    signal_word: "Gefahr",
    h: ["H272", "H290", "H314", "H331", "EUH071"],
    vapor_pressure: null,
    density: "ca. 1,51 g/cm\xB3 (100 %, 20 \xB0C)",
    water_solubility: "mischbar",
    melting_point: "ca. \u221242 \xB0C (100 %)",
    boiling_point: "ca. 83 \xB0C (100 %)",
    fire_info: "Nicht brennbar; oxidierend. Einstufung gehaltsabh\xE4ngig.",
    lel_vol: null,
    uel_vol: null,
    ie_ev: null,
    ims_sim: false,
    ...std(["Pr\xFCfr\xF6hrchen"], ["pH-Messung", "Laboranalytik"]),
    source_id: "gestis"
  },
  {
    id: "schwefelsaeure",
    name: "Schwefels\xE4ure",
    synonyms: ["H2SO4"],
    cas: "7664-93-9",
    formula: "H\u2082SO\u2084",
    molar_mass: 98.08,
    state: L,
    color: "farblos, \xF6lig",
    odor: "geruchlos",
    substance_group: "Anorganische S\xE4ure",
    cbrn_category: "C",
    subcategory: "TIC",
    un_number: "1830",
    ghs: ["GHS05"],
    signal_word: "Gefahr",
    h: ["H290", "H314"],
    vapor_pressure: "sehr gering",
    density: "ca. 1,84 g/cm\xB3 (98 %, 20 \xB0C)",
    water_solubility: "mischbar (stark exotherm)",
    melting_point: null,
    boiling_point: "ca. 335 \xB0C (98 %)",
    fire_info: "Nicht brennbar",
    lel_vol: null,
    uel_vol: null,
    ie_ev: null,
    ims_sim: false,
    ...std([], ["pH-Messung", "Laboranalytik"]),
    source_id: "gestis"
  },
  {
    id: "salzsaeure",
    name: "Salzs\xE4ure",
    synonyms: ["Chlorwasserstoff (w\xE4ssrige L\xF6sung)", "HCl"],
    cas: "7647-01-0",
    formula: "HCl",
    molar_mass: 36.46,
    state: L,
    color: "farblos",
    odor: "stechend",
    substance_group: "Anorganische S\xE4ure",
    cbrn_category: "C",
    subcategory: "TIC",
    un_number: "1789",
    ghs: ["GHS05", "GHS07"],
    signal_word: "Gefahr",
    h: ["H290", "H314", "H335"],
    vapor_pressure: null,
    density: "ca. 1,18 g/cm\xB3 (37 %, 20 \xB0C)",
    water_solubility: "mischbar",
    melting_point: null,
    boiling_point: null,
    fire_info: "Nicht brennbar",
    lel_vol: null,
    uel_vol: null,
    ie_ev: 12.75,
    ims_sim: false,
    ...std(["Pr\xFCfr\xF6hrchen"], ["pH-Messung", "Pr\xFCfr\xF6hrchen", "Laboranalytik"]),
    source_id: "gestis",
    notes: "Einstufung gehaltsabh\xE4ngig; IE gilt f\xFCr gasf\xF6rmiges HCl."
  },
  {
    id: "natriumhydroxid",
    name: "Natriumhydroxid",
    synonyms: ["\xC4tznatron", "Natronlauge (L\xF6sung)", "NaOH"],
    cas: "1310-73-2",
    formula: "NaOH",
    molar_mass: 40,
    state: S,
    color: "wei\xDF",
    odor: "geruchlos",
    substance_group: "Anorganische Base",
    cbrn_category: "C",
    subcategory: "TIC",
    un_number: "1823 (fest) / 1824 (L\xF6sung)",
    ghs: ["GHS05"],
    signal_word: "Gefahr",
    h: ["H290", "H314"],
    vapor_pressure: null,
    density: "ca. 2,13 g/cm\xB3",
    water_solubility: "ca. 1090 g/L (20 \xB0C)",
    melting_point: "ca. 323 \xB0C",
    boiling_point: "ca. 1388 \xB0C",
    fire_info: "Nicht brennbar",
    lel_vol: null,
    uel_vol: null,
    ie_ev: null,
    ims_sim: false,
    ...std([], ["pH-Messung", "Laboranalytik"]),
    source_id: "gestis"
  },
  // ---- Chemische Kampfstoffe: ausschließlich Identifikationsdaten ----
  {
    id: "sarin",
    name: "Sarin (GB)",
    synonyms: ["GB", "Isopropyl-methylphosphonofluoridat"],
    cas: "107-44-8",
    formula: "C\u2084H\u2081\u2080FO\u2082P",
    molar_mass: 140.09,
    state: L,
    color: "farblos",
    odor: "in reiner Form nahezu geruchlos",
    substance_group: "Nervenkampfstoff (G-Reihe)",
    cbrn_category: "C",
    subcategory: "CWA",
    un_number: null,
    ghs: [],
    signal_word: null,
    h: [],
    vapor_pressure: "ca. 2,9 hPa (20 \xB0C)",
    density: "ca. 1,09 g/cm\xB3",
    water_solubility: "mischbar",
    melting_point: "ca. \u221256 \xB0C",
    boiling_point: "ca. 147 \xB0C",
    fire_info: null,
    lel_vol: null,
    uel_vol: null,
    ie_ev: null,
    ims_sim: true,
    ...std(["IMS", "Pr\xFCfr\xF6hrchen"], ["IMS-Screening", "Kampfstoff-Pr\xFCfr\xF6hrchen", "Laboranalytik (GC-MS)"]),
    source_id: "opcw",
    notes: "Chemiewaffen\xFCbereinkommen: Liste 1. Keine harmonisierte GHS-/UN-Zuordnung hinterlegt."
  },
  {
    id: "soman",
    name: "Soman (GD)",
    synonyms: ["GD", "Pinacolyl-methylphosphonofluoridat"],
    cas: "96-64-0",
    formula: "C\u2087H\u2081\u2086FO\u2082P",
    molar_mass: 182.17,
    state: L,
    color: "farblos",
    odor: null,
    substance_group: "Nervenkampfstoff (G-Reihe)",
    cbrn_category: "C",
    subcategory: "CWA",
    un_number: null,
    ghs: [],
    signal_word: null,
    h: [],
    vapor_pressure: null,
    density: "ca. 1,02 g/cm\xB3",
    water_solubility: null,
    melting_point: "ca. \u221242 \xB0C",
    boiling_point: "ca. 198 \xB0C",
    fire_info: null,
    lel_vol: null,
    uel_vol: null,
    ie_ev: null,
    ims_sim: true,
    ...std(["IMS", "Pr\xFCfr\xF6hrchen"], ["IMS-Screening", "Kampfstoff-Pr\xFCfr\xF6hrchen", "Laboranalytik (GC-MS)"]),
    source_id: "opcw",
    notes: "Chemiewaffen\xFCbereinkommen: Liste 1."
  },
  {
    id: "tabun",
    name: "Tabun (GA)",
    synonyms: ["GA", "Ethyl-N,N-dimethylphosphoramidocyanidat"],
    cas: "77-81-6",
    formula: "C\u2085H\u2081\u2081N\u2082O\u2082P",
    molar_mass: 162.13,
    state: L,
    color: "farblos bis br\xE4unlich",
    odor: null,
    substance_group: "Nervenkampfstoff (G-Reihe)",
    cbrn_category: "C",
    subcategory: "CWA",
    un_number: null,
    ghs: [],
    signal_word: null,
    h: [],
    vapor_pressure: null,
    density: "ca. 1,08 g/cm\xB3",
    water_solubility: null,
    melting_point: "ca. \u221250 \xB0C",
    boiling_point: "ca. 240 \xB0C",
    fire_info: null,
    lel_vol: null,
    uel_vol: null,
    ie_ev: null,
    ims_sim: true,
    ...std(["IMS", "Pr\xFCfr\xF6hrchen"], ["IMS-Screening", "Kampfstoff-Pr\xFCfr\xF6hrchen", "Laboranalytik (GC-MS)"]),
    source_id: "opcw",
    notes: "Chemiewaffen\xFCbereinkommen: Liste 1."
  },
  {
    id: "vx",
    name: "VX",
    synonyms: ["O-Ethyl-S-[2-(diisopropylamino)ethyl]-methylphosphonothioat"],
    cas: "50782-69-9",
    formula: "C\u2081\u2081H\u2082\u2086NO\u2082PS",
    molar_mass: 267.37,
    state: L,
    color: "farblos bis bernsteinfarben",
    odor: null,
    substance_group: "Nervenkampfstoff (V-Reihe)",
    cbrn_category: "C",
    subcategory: "CWA",
    un_number: null,
    ghs: [],
    signal_word: null,
    h: [],
    vapor_pressure: "sehr gering (schwerfl\xFCchtig)",
    density: "ca. 1,01 g/cm\xB3",
    water_solubility: null,
    melting_point: null,
    boiling_point: null,
    fire_info: null,
    lel_vol: null,
    uel_vol: null,
    ie_ev: null,
    ims_sim: true,
    ...std(["IMS"], ["IMS-Screening", "Kampfstoff-Pr\xFCfr\xF6hrchen", "Laboranalytik (GC-MS / LC-MS)"]),
    source_id: "opcw",
    notes: "Chemiewaffen\xFCbereinkommen: Liste 1. Schwerfl\xFCchtig \u2013 Bodenkontamination/Probenahme relevant."
  },
  {
    id: "schwefellost",
    name: "Schwefellost (HD)",
    synonyms: ["Senfgas", "Bis(2-chlorethyl)sulfid", "HD"],
    cas: "505-60-2",
    formula: "C\u2084H\u2088Cl\u2082S",
    molar_mass: 159.08,
    state: L,
    color: "farblos bis gelbbraun",
    odor: "knoblauch-/senfartig",
    substance_group: "Hautkampfstoff (Lost)",
    cbrn_category: "C",
    subcategory: "CWA",
    un_number: null,
    ghs: [],
    signal_word: null,
    h: [],
    vapor_pressure: "ca. 0,1 hPa (20 \xB0C)",
    density: "ca. 1,27 g/cm\xB3",
    water_solubility: "gering",
    melting_point: "ca. 14 \xB0C",
    boiling_point: "ca. 217 \xB0C (Zersetzung)",
    fire_info: null,
    lel_vol: null,
    uel_vol: null,
    ie_ev: null,
    ims_sim: true,
    ...std(["IMS", "Pr\xFCfr\xF6hrchen"], ["IMS-Screening", "Kampfstoff-Pr\xFCfr\xF6hrchen", "Laboranalytik (GC-MS)"]),
    source_id: "opcw",
    notes: "Chemiewaffen\xFCbereinkommen: Liste 1."
  },
  {
    id: "stickstofflost",
    name: "Stickstofflost (HN-3)",
    synonyms: ["Tris(2-chlorethyl)amin", "HN-3"],
    cas: "555-77-1",
    formula: "C\u2086H\u2081\u2082Cl\u2083N",
    molar_mass: 204.52,
    state: L,
    color: "farblos bis hellgelb",
    odor: null,
    substance_group: "Hautkampfstoff (Lost)",
    cbrn_category: "C",
    subcategory: "CWA",
    un_number: null,
    ghs: [],
    signal_word: null,
    h: [],
    vapor_pressure: null,
    density: null,
    water_solubility: null,
    melting_point: null,
    boiling_point: null,
    fire_info: null,
    lel_vol: null,
    uel_vol: null,
    ie_ev: null,
    ims_sim: true,
    ...std(["IMS"], ["IMS-Screening", "Laboranalytik (GC-MS)"]),
    source_id: "opcw",
    notes: "Chemiewaffen\xFCbereinkommen: Liste 1. Weitere Stickstoff-Lost-Verbindungen (HN-1, HN-2) nicht erfasst."
  },
  {
    id: "lewisit",
    name: "Lewisit (L)",
    synonyms: ["2-Chlorvinyldichlorarsin"],
    cas: "541-25-3",
    formula: "C\u2082H\u2082AsCl\u2083",
    molar_mass: 207.32,
    state: L,
    color: "farblos bis dunkel",
    odor: "geranienartig",
    substance_group: "Hautkampfstoff (arsenhaltig)",
    cbrn_category: "C",
    subcategory: "CWA",
    un_number: null,
    ghs: [],
    signal_word: null,
    h: [],
    vapor_pressure: null,
    density: "ca. 1,89 g/cm\xB3",
    water_solubility: null,
    melting_point: null,
    boiling_point: "ca. 190 \xB0C",
    fire_info: null,
    lel_vol: null,
    uel_vol: null,
    ie_ev: null,
    ims_sim: true,
    ...std(["IMS"], ["IMS-Screening", "Laboranalytik"]),
    source_id: "opcw",
    notes: "Chemiewaffen\xFCbereinkommen: Liste 1."
  }
];

// server/data/substances2.ts
var T = (id, name, cas, formula, M, state2, group, un, ghs, sig, h, o = {}) => ({
  id,
  name,
  synonyms: o.synonyms ?? [],
  cas,
  formula,
  molar_mass: M,
  state: state2,
  color: o.color ?? null,
  odor: o.odor ?? null,
  substance_group: group,
  cbrn_category: "C",
  subcategory: "TIC",
  un_number: un,
  ghs,
  signal_word: sig,
  h,
  vapor_pressure: o.vp ?? null,
  density: o.dens ?? null,
  water_solubility: o.wsol ?? null,
  melting_point: o.mp ?? null,
  boiling_point: o.bp ?? null,
  fire_info: o.fire ?? null,
  lel_vol: o.lel ?? null,
  uel_vol: o.uel ?? null,
  ie_ev: o.ie ?? null,
  ims_sim: o.ims_sim ?? false,
  methods: [],
  devices: [],
  source_id: "gestis",
  notes: o.notes,
  origins: o.origins,
  ph: o.ph,
  water_reactive: o.water_reactive,
  oxidizer: o.oxidizer
});
var G2 = "Gas";
var L2 = "Fl\xFCssigkeit";
var S2 = "Feststoff";
var substances2 = [
  // ---- Gase
  T("propan", "Propan", "74-98-6", "C\u2083H\u2088", 44.1, G2, "Brennbares Gas / Fl\xFCssiggas", "1978", ["GHS02", "GHS04"], "Gefahr", ["H220", "H280"], { synonyms: ["LPG-Bestandteil"], odor: "geruchlos (Fl\xFCssiggas wird odoriert)", bp: "\u221242 \xB0C", mp: "\u2212188 \xB0C", lel: 1.7, uel: 10.9, ie: 10.94, fire: "Extrem entz\xFCndbares Gas; Z\xFCndbereich ca. 1,7\u201310,9 Vol.-%", origins: ["haushalt", "tankstelle", "baustelle", "industrie", "tankwagen"] }),
  T("butan", "Butan", "106-97-8", "C\u2084H\u2081\u2080", 58.12, G2, "Brennbares Gas / Fl\xFCssiggas", "1011", ["GHS02", "GHS04"], "Gefahr", ["H220", "H280"], { odor: "geruchlos (Fl\xFCssiggas wird odoriert)", bp: "ca. \u22120,5 \xB0C", mp: "\u2212138 \xB0C", lel: 1.4, uel: 9.3, ie: 10.53, fire: "Extrem entz\xFCndbares Gas; Z\xFCndbereich ca. 1,4\u20139,3 Vol.-%", origins: ["haushalt", "tankstelle", "baustelle", "industrie"] }),
  T("fluessiggas", "Fl\xFCssiggas (LPG)", "68476-85-7", "C\u2083H\u2088 / C\u2084H\u2081\u2080 (Gemisch)", null, G2, "Brennbares Gas / Fl\xFCssiggas", "1965 / 1075", ["GHS02", "GHS04"], "Gefahr", ["H220", "H280"], { synonyms: ["Autogas", "Propan-Butan-Gemisch"], odor: "odoriert, unangenehm", lel: 1.5, fire: "Extrem entz\xFCndbares Gas; schwerer als Luft", origins: ["haushalt", "tankstelle", "tankwagen", "baustelle"], notes: "Gasdichte etwa 1,5\u20132-fach der Luft: sammelt sich in Senken/Kellern." }),
  T("methan", "Methan (Erdgas)", "74-82-8", "CH\u2084", 16.04, G2, "Brennbares Gas", "1971", ["GHS02", "GHS04"], "Gefahr", ["H220", "H280"], { synonyms: ["Erdgas", "Faulgas/Biogas (Hauptbestandteil)", "Grubengas"], odor: "geruchlos (Erdgas wird odoriert)", bp: "\u2212161,5 \xB0C", mp: "\u2212182 \xB0C", lel: 4.4, uel: 17, ie: 12.6, fire: "Extrem entz\xFCndbares Gas; Z\xFCndbereich ca. 4,4\u201317 Vol.-%", origins: ["kanal", "industrie", "landwirtschaft", "haushalt"] }),
  T("wasserstoff", "Wasserstoff", "1333-74-0", "H\u2082", 2.02, G2, "Brennbares Gas", "1049", ["GHS02", "GHS04"], "Gefahr", ["H220", "H280"], { odor: "geruchlos", bp: "\u2212252,9 \xB0C", mp: "\u2212259 \xB0C", lel: 4, uel: 77, ie: 15.43, fire: "Extrem entz\xFCndbares Gas; sehr weiter Z\xFCndbereich ca. 4\u201377 Vol.-%; Flamme kaum sichtbar", origins: ["industrie", "labor", "tankwagen"] }),
  T("acetylen", "Acetylen (Ethin)", "74-86-2", "C\u2082H\u2082", 26.04, G2, "Brennbares Gas / Schwei\xDFgas", "1001", ["GHS02", "GHS04"], "Gefahr", ["H220", "H230", "H280"], { odor: "knoblauchartig (technisch)", bp: "Sublimation ca. \u221284 \xB0C", lel: 2.3, ie: 11.4, fire: "Extrem entz\xFCndbar; kann auch ohne Luft explosionsartig zerfallen", origins: ["werkstatt", "baustelle", "industrie"] }),
  T("ethylen", "Ethylen (Ethen)", "74-85-1", "C\u2082H\u2084", 28.05, G2, "Brennbares Gas", "1962", ["GHS02", "GHS04", "GHS07"], "Gefahr", ["H220", "H280", "H336"], { odor: "schwach s\xFC\xDFlich", bp: "\u2212103,7 \xB0C", lel: 2.3, uel: 36, ie: 10.51, fire: "Extrem entz\xFCndbares Gas; Z\xFCndbereich ca. 2,3\u201336 Vol.-%", origins: ["industrie", "landwirtschaft"] }),
  T("dimethylether", "Dimethylether", "115-10-6", "C\u2082H\u2086O", 46.07, G2, "Brennbares Gas / Treibgas", "1033", ["GHS02", "GHS04"], "Gefahr", ["H220", "H280"], { synonyms: ["DME"], odor: "schwach \xE4therisch", bp: "\u221224,8 \xB0C", lel: 3.4, uel: 27, ie: 10.03, fire: "Extrem entz\xFCndbares Gas; Z\xFCndbereich ca. 3,4\u201327 Vol.-%", origins: ["haushalt", "industrie"] }),
  T("stickstoff", "Stickstoff", "7727-37-9", "N\u2082", 28.01, G2, "Inertgas / Erstickungsgas", "1066 (verdichtet) / 1977 (tiefkalt)", ["GHS04"], "Achtung", ["H280"], { odor: "geruchlos", bp: "\u2212195,8 \xB0C", mp: "\u2212210 \xB0C", fire: "Nicht brennbar", notes: "Verdr\xE4ngt Sauerstoff (Erstickungsgefahr, O\u2082-Messung!). Tiefkalt verfl\xFCssigt: K\xE4lteverbrennungen.", origins: ["labor", "industrie", "kuehlanlage"] }),
  T("argon", "Argon", "7440-37-1", "Ar", 39.95, G2, "Inertgas / Erstickungsgas", "1006", ["GHS04"], "Achtung", ["H280"], { odor: "geruchlos", bp: "\u2212185,9 \xB0C", fire: "Nicht brennbar", notes: "Schwerer als Luft; verdr\xE4ngt Sauerstoff.", origins: ["werkstatt", "industrie", "labor"] }),
  T("helium", "Helium", "7440-59-7", "He", 4, G2, "Inertgas / Erstickungsgas", "1046", ["GHS04"], "Achtung", ["H280"], { odor: "geruchlos", bp: "\u2212268,9 \xB0C", fire: "Nicht brennbar", origins: ["labor", "industrie"] }),
  T("sauerstoff", "Sauerstoff", "7782-44-7", "O\u2082", 32, G2, "Oxidierendes Gas", "1072", ["GHS03", "GHS04"], "Gefahr", ["H270", "H280"], { odor: "geruchlos", bp: "\u2212183 \xB0C", fire: "Nicht brennbar, aber stark brandf\xF6rdernd", oxidizer: true, origins: ["industrie", "werkstatt", "labor"] }),
  T("lachgas", "Distickstoffmonoxid (Lachgas)", "10024-97-2", "N\u2082O", 44.01, G2, "Oxidierendes Gas", "1070", ["GHS03", "GHS04"], "Gefahr", ["H270", "H280"], { synonyms: ["Lachgas"], odor: "schwach s\xFC\xDFlich", bp: "\u221288,5 \xB0C", fire: "Nicht brennbar; brandf\xF6rdernd", oxidizer: true, ie: 12.89, origins: ["haushalt", "industrie"] }),
  T("stickstoffdioxid", "Stickstoffdioxid", "10102-44-0", "NO\u2082", 46.01, G2, "Nitrose Gase / Lungenreizstoff", "1067", ["GHS03", "GHS04", "GHS05", "GHS06"], "Gefahr", ["H270", "H280", "H314", "H330"], { synonyms: ["nitrose Gase (Silogas)"], color: "rotbraun", odor: "stechend", bp: "ca. 21 \xB0C", mp: "\u221211 \xB0C", ie: 9.59, fire: "Nicht brennbar; brandf\xF6rdernd", oxidizer: true, origins: ["landwirtschaft", "industrie", "brand"], notes: 'Typisch bei Silo-/G\xE4rfutter-Unf\xE4llen ("Silogas") und Nitrierprozessen; Lungen\xF6dem kann verz\xF6gert auftreten.' }),
  T("stickstoffmonoxid", "Stickstoffmonoxid", "10102-43-9", "NO", 30.01, G2, "Nitrose Gase", "1660", ["GHS03", "GHS04", "GHS05", "GHS06"], "Gefahr", ["H270", "H280", "H314", "H330"], { color: "farblos", odor: "stechend (reagiert mit Luft zu NO\u2082)", bp: "\u2212151,8 \xB0C", ie: 9.26, oxidizer: true, fire: "Nicht brennbar; brandf\xF6rdernd", origins: ["industrie", "brand", "labor"] }),
  T("fluorwasserstoff", "Fluorwasserstoff (Flusss\xE4ure)", "7664-39-3", "HF", 20.01, L2, "Anorganische S\xE4ure / Kontaktgift", "1052 (wasserfrei) / 1790 (L\xF6sung)", ["GHS05", "GHS06"], "Gefahr", ["H300", "H310", "H330", "H314"], { synonyms: ["Flusss\xE4ure (w\xE4ssrige L\xF6sung)", "Hydrogenfluorid"], color: "farblos", odor: "stechend", bp: "19,5 \xB0C", mp: "\u221283,6 \xB0C", wsol: "mischbar", ie: 15.98, fire: "Nicht brennbar; greift Glas/Metalle an (Wasserstoffbildung)", ph: "sauer", origins: ["industrie", "werkstatt", "labor"], notes: "Haut- und Atemwegsgift mit Tiefenwirkung; Symptome k\xF6nnen verz\xF6gert auftreten; \xC4rztliche Behandlung zwingend." }),
  T("ethylenoxid", "Ethylenoxid", "75-21-8", "C\u2082H\u2084O", 44.05, G2, "Brennbares Gas / Sterilisationsgas", "1040", ["GHS02", "GHS04", "GHS06", "GHS08"], "Gefahr", ["H220", "H280", "H331", "H319", "H335", "H315", "H340", "H350"], { odor: "s\xFC\xDFlich-\xE4therisch", bp: "10,7 \xB0C", mp: "\u2212112 \xB0C", lel: 2.6, uel: 100, ie: 10.57, fire: "Extrem entz\xFCndbar; kann auch ohne Luft explosionsartig zerfallen", origins: ["industrie", "labor"] }),
  T("vinylchlorid", "Vinylchlorid", "75-01-4", "C\u2082H\u2083Cl", 62.5, G2, "Brennbares Gas / Chlorkohlenwasserstoff", "1086", ["GHS02", "GHS04", "GHS08"], "Gefahr", ["H220", "H280", "H350"], { synonyms: ["Chlorethen", "VC"], odor: "schwach s\xFC\xDFlich", bp: "\u221213,4 \xB0C", mp: "\u2212154 \xB0C", lel: 3.6, uel: 33, ie: 9.99, fire: "Extrem entz\xFCndbar; Brandgase enthalten Chlorwasserstoff (HCl) und evtl. Phosgen", origins: ["industrie", "brand"] }),
  T("phosphin", "Phosphin", "7803-51-2", "PH\u2083", 34, G2, "Giftiges Gas / Begasungsmittel", "2199", ["GHS02", "GHS04", "GHS05", "GHS06", "GHS09"], "Gefahr", ["H220", "H280", "H330", "H314", "H400"], { synonyms: ["Monophosphan"], odor: "knoblauch-/fischartig", bp: "\u221287,7 \xB0C", ie: 9.87, fire: "Extrem entz\xFCndbar, kann sich selbst entz\xFCnden", origins: ["landwirtschaft", "industrie"], notes: "Typisch bei Begasung von Getreide/Containern (Phosphid-Pr\xE4parate reagieren mit Feuchtigkeit)." }),
  T("arsin", "Arsin (Arsenwasserstoff)", "7784-42-1", "AsH\u2083", 77.95, G2, "Giftiges Gas", "2188", ["GHS02", "GHS04", "GHS06", "GHS08", "GHS09"], "Gefahr", ["H220", "H280", "H330", "H373", "H410"], { odor: "knoblauchartig", bp: "\u221262,5 \xB0C", ie: 9.89, fire: "Extrem entz\xFCndbares Gas", origins: ["industrie", "labor"] }),
  T("r134a", "Tetrafluorethan (R134a)", "811-97-2", "C\u2082H\u2082F\u2084", 102.03, G2, "K\xE4ltemittel / Inertgas", "3159", ["GHS04"], "Achtung", ["H280"], { synonyms: ["R134a", "HFKW-134a"], odor: "geruchlos", bp: "\u221226,3 \xB0C", fire: "Nicht brennbar; bei Brand Bildung von Fluorwasserstoff", notes: "Schwerer als Luft; verdr\xE4ngt Sauerstoff.", origins: ["kuehlanlage", "werkstatt", "haushalt"] }),
  // ---- Flüssigkeiten: Kohlenwasserstoffe / Kraftstoffe
  T("benzin", "Benzin (Ottokraftstoff)", "8006-61-9", "Kohlenwasserstoffgemisch", null, L2, "Kraftstoff / Kohlenwasserstoffgemisch", "1203", ["GHS02", "GHS07", "GHS08", "GHS09"], "Gefahr", ["H224", "H304", "H315", "H336", "H340", "H350", "H361fd", "H411"], { synonyms: ["Ottokraftstoff", "Super", "Gasoline"], color: "farblos bis gelblich/gef\xE4rbt", odor: "benzinartig, aromatisch", dens: "ca. 0,72\u20130,78 g/cm\xB3", wsol: "sehr gering", fire: "Flammpunkt < \u221220 \xB0C; D\xE4mpfe schwerer als Luft; Z\xFCndbereich ca. 0,6\u20138 Vol.-%", lel: 0.6, uel: 8, origins: ["tankstelle", "tankwagen", "werkstatt", "haushalt"], notes: "Schwimmt auf Wasser; D\xE4mpfe bilden explosionsf\xE4hige Gemische am Boden." }),
  T("diesel", "Dieselkraftstoff", "68476-34-6", "Kohlenwasserstoffgemisch", null, L2, "Kraftstoff / Kohlenwasserstoffgemisch", "1202", ["GHS02", "GHS07", "GHS08", "GHS09"], "Gefahr", ["H226", "H304", "H315", "H332", "H351", "H373", "H411"], { synonyms: ["Diesel", "Gas\xF6l"], color: "gelblich", odor: "\xF6lig, charakteristisch", dens: "ca. 0,82\u20130,85 g/cm\xB3", wsol: "sehr gering", fire: "Flammpunkt > 55 \xB0C", lel: 0.6, uel: 6.5, origins: ["tankstelle", "tankwagen", "werkstatt", "baustelle"], notes: "Schwimmt auf Wasser; Gew\xE4ssergef\xE4hrdung." }),
  T("heizoel", "Heiz\xF6l EL", "68476-30-2", "Kohlenwasserstoffgemisch", null, L2, "Heiz\xF6l / Kohlenwasserstoffgemisch", "1202", ["GHS02", "GHS07", "GHS08", "GHS09"], "Gefahr", ["H226", "H304", "H315", "H332", "H351", "H373", "H411"], { synonyms: ["Heiz\xF6l leicht"], color: "gelblich bis r\xF6tlich (gef\xE4rbt)", odor: "\xF6lig, charakteristisch", dens: "ca. 0,83\u20130,86 g/cm\xB3", wsol: "sehr gering", fire: "Flammpunkt > 55 \xB0C", origins: ["haushalt", "tankwagen", "baustelle"], notes: "Schwimmt auf Wasser; Gew\xE4ssergef\xE4hrdung." }),
  T("kerosin", "Kerosin (Jet A-1)", "8008-20-6", "Kohlenwasserstoffgemisch", null, L2, "Kraftstoff / Kohlenwasserstoffgemisch", "1223", ["GHS02", "GHS07", "GHS08", "GHS09"], "Gefahr", ["H226", "H304", "H315", "H336", "H411"], { synonyms: ["Petroleum", "Jet A-1"], color: "farblos bis hellgelb", odor: "petroleumartig", dens: "ca. 0,78\u20130,81 g/cm\xB3", wsol: "sehr gering", fire: "Flammpunkt > 38 \xB0C", origins: ["tankwagen", "industrie", "haushalt"], notes: "Schwimmt auf Wasser." }),
  T("nhexan", "n-Hexan", "110-54-3", "C\u2086H\u2081\u2084", 86.18, L2, "Aliphatischer Kohlenwasserstoff / L\xF6semittel", "1208", ["GHS02", "GHS07", "GHS08", "GHS09"], "Gefahr", ["H225", "H304", "H315", "H336", "H361f", "H373", "H411"], { odor: "benzinartig", bp: "69 \xB0C", mp: "\u221295 \xB0C", vp: "ca. 160 hPa (20 \xB0C)", dens: "0,66 g/cm\xB3", wsol: "sehr gering", fire: "Flammpunkt ca. \u221222 \xB0C; Z\xFCndbereich ca. 1\u20138,4 Vol.-%", lel: 1, uel: 8.4, ie: 10.13, origins: ["industrie", "labor", "werkstatt"] }),
  T("cyclohexan", "Cyclohexan", "110-82-7", "C\u2086H\u2081\u2082", 84.16, L2, "Alicyclischer Kohlenwasserstoff / L\xF6semittel", "1145", ["GHS02", "GHS07", "GHS08", "GHS09"], "Gefahr", ["H225", "H304", "H315", "H336", "H410"], { odor: "benzinartig, s\xFC\xDFlich", bp: "81 \xB0C", mp: "6,5 \xB0C", dens: "0,78 g/cm\xB3", wsol: "sehr gering", fire: "Flammpunkt ca. \u221218 \xB0C", lel: 1, ie: 9.88, origins: ["industrie", "labor", "werkstatt"] }),
  T("styrol", "Styrol", "100-42-5", "C\u2088H\u2088", 104.15, L2, "Aromatischer Kohlenwasserstoff / Monomer", "2055", ["GHS02", "GHS07", "GHS08"], "Gefahr", ["H226", "H315", "H319", "H332", "H361d", "H372"], { synonyms: ["Vinylbenzol"], odor: "s\xFC\xDFlich-aromatisch, stechend", bp: "145 \xB0C", mp: "\u221231 \xB0C", dens: "0,91 g/cm\xB3", wsol: "sehr gering", fire: "Flammpunkt ca. 31 \xB0C; kann polymerisieren", lel: 1, uel: 6.1, ie: 8.43, origins: ["industrie", "werkstatt", "baustelle"], notes: "Typisch bei GFK-/Polyesterharz-Verarbeitung." }),
  // ---- Flüssigkeiten: Lösemittel
  T("ethylacetat", "Ethylacetat", "141-78-6", "C\u2084H\u2088O\u2082", 88.11, L2, "Ester / L\xF6semittel", "1173", ["GHS02", "GHS07"], "Gefahr", ["H225", "H319", "H336", "EUH066"], { synonyms: ["Essigs\xE4ureethylester"], odor: "fruchtig, l\xF6semittelartig", bp: "77 \xB0C", mp: "\u221283 \xB0C", dens: "0,90 g/cm\xB3", wsol: "ca. 80 g/L", fire: "Flammpunkt ca. \u22124 \xB0C", lel: 2, uel: 11.5, ie: 10.01, origins: ["werkstatt", "industrie", "labor", "haushalt"] }),
  T("butylacetat", "n-Butylacetat", "123-86-4", "C\u2086H\u2081\u2082O\u2082", 116.16, L2, "Ester / L\xF6semittel", "1123", ["GHS02"], "Achtung", ["H226", "H336", "EUH066"], { odor: "fruchtig", bp: "126 \xB0C", dens: "0,88 g/cm\xB3", wsol: "gering (ca. 5 g/L)", fire: "Flammpunkt ca. 27 \xB0C", lel: 1.2, uel: 7.5, ie: 10, origins: ["werkstatt", "industrie"] }),
  T("butanon", "Butanon (MEK)", "78-93-3", "C\u2084H\u2088O", 72.11, L2, "Keton / L\xF6semittel", "1193", ["GHS02", "GHS07"], "Gefahr", ["H225", "H319", "H336", "EUH066"], { synonyms: ["Methylethylketon", "MEK"], odor: "s\xFC\xDFlich, aceton-\xE4hnlich", bp: "79,6 \xB0C", mp: "\u221286 \xB0C", dens: "0,81 g/cm\xB3", wsol: "ca. 250 g/L", fire: "Flammpunkt ca. \u22129 \xB0C", lel: 1.5, ie: 9.51, origins: ["werkstatt", "industrie", "labor"] }),
  T("diethylether", "Diethylether", "60-29-7", "C\u2084H\u2081\u2080O", 74.12, L2, "Ether / L\xF6semittel", "1155", ["GHS02", "GHS07"], "Gefahr", ["H224", "H302", "H336", "EUH019", "EUH066"], { synonyms: ["Ether"], odor: "s\xFC\xDFlich-\xE4therisch", bp: "34,6 \xB0C", mp: "\u2212116 \xB0C", dens: "0,71 g/cm\xB3", wsol: "ca. 60 g/L", fire: "Flammpunkt ca. \u221240 \xB0C; Z\xFCndbereich ca. 1,7\u201336 Vol.-%; kann explosive Peroxide bilden", lel: 1.7, uel: 36, ie: 9.51, origins: ["labor", "industrie"] }),
  T("thf", "Tetrahydrofuran (THF)", "109-99-9", "C\u2084H\u2088O", 72.11, L2, "Ether / L\xF6semittel", "2056", ["GHS02", "GHS07", "GHS08"], "Gefahr", ["H225", "H302", "H319", "H335", "H336", "H351", "EUH019"], { odor: "\xE4therisch", bp: "66 \xB0C", mp: "\u2212108 \xB0C", dens: "0,89 g/cm\xB3", wsol: "mischbar", fire: "Flammpunkt ca. \u221221 \xB0C; kann Peroxide bilden", lel: 1.5, uel: 12, ie: 9.4, origins: ["labor", "industrie", "werkstatt"] }),
  T("propylenoxid", "Propylenoxid", "75-56-9", "C\u2083H\u2086O", 58.08, L2, "Epoxid / reaktives L\xF6semittel", "1280", ["GHS02", "GHS07", "GHS08"], "Gefahr", ["H224", "H332", "H302", "H312", "H315", "H319", "H335", "H340", "H350"], { odor: "s\xFC\xDFlich-\xE4therisch", bp: "34 \xB0C", dens: "0,83 g/cm\xB3", wsol: "gut l\xF6slich", fire: "Flammpunkt ca. \u221237 \xB0C", lel: 1.9, uel: 37, ie: 10.22, origins: ["industrie", "labor"] }),
  T("dichlormethan", "Dichlormethan", "75-09-2", "CH\u2082Cl\u2082", 84.93, L2, "Chlorkohlenwasserstoff / L\xF6semittel", "1593", ["GHS07", "GHS08"], "Achtung", ["H315", "H319", "H336", "H351"], { synonyms: ["Methylenchlorid", "DCM"], odor: "s\xFC\xDFlich, \xE4therisch", bp: "40 \xB0C", mp: "\u221297 \xB0C", vp: "ca. 475 hPa (20 \xB0C)", dens: "1,33 g/cm\xB3 (schwerer als Wasser)", wsol: "ca. 20 g/L", fire: "Nicht brennbar (kein Flammpunkt); thermische Zersetzung: HCl, Phosgen", ie: 11.32, origins: ["werkstatt", "industrie", "labor"], notes: "Abbeizer; Brandgase k\xF6nnen Phosgen enthalten." }),
  T("chloroform", "Chloroform (Trichlormethan)", "67-66-3", "CHCl\u2083", 119.38, L2, "Chlorkohlenwasserstoff / L\xF6semittel", "1888", ["GHS06", "GHS08"], "Gefahr", ["H302", "H331", "H315", "H319", "H336", "H351", "H361d", "H372"], { synonyms: ["Trichlormethan"], odor: "s\xFC\xDFlich", bp: "61 \xB0C", mp: "\u221263,5 \xB0C", dens: "1,49 g/cm\xB3 (schwerer als Wasser)", wsol: "ca. 8 g/L", fire: "Nicht brennbar; thermische Zersetzung: HCl, Phosgen", ie: 11.37, origins: ["labor", "industrie"] }),
  T("tetrachlorethen", "Tetrachlorethen (Per)", "127-18-4", "C\u2082Cl\u2084", 165.83, L2, "Chlorkohlenwasserstoff / Reinigungsmittel", "1897", ["GHS07", "GHS08", "GHS09"], "Achtung", ["H315", "H319", "H336", "H351", "H411"], { synonyms: ["Perchlorethylen", "PER"], odor: "s\xFC\xDFlich-\xE4therisch", bp: "121 \xB0C", mp: "\u221222 \xB0C", dens: "1,62 g/cm\xB3 (schwerer als Wasser)", wsol: "sehr gering", fire: "Nicht brennbar; thermische Zersetzung: HCl, Phosgen", ie: 9.32, origins: ["industrie", "werkstatt"], notes: "Chemische Reinigung, Entfetter." }),
  T("trichlorethen", "Trichlorethen (Tri)", "79-01-6", "C\u2082HCl\u2083", 131.39, L2, "Chlorkohlenwasserstoff / Entfetter", "1710", ["GHS07", "GHS08"], "Gefahr", ["H315", "H319", "H336", "H341", "H350", "H412"], { synonyms: ["Trichlorethylen", "TRI"], odor: "s\xFC\xDFlich, chloroformartig", bp: "87 \xB0C", mp: "\u221285 \xB0C", dens: "1,46 g/cm\xB3 (schwerer als Wasser)", wsol: "gering", fire: "Nicht brennbar; thermische Zersetzung: HCl, Phosgen", ie: 9.47, origins: ["industrie", "werkstatt"] }),
  T("kohlenstoffdisulfid", "Kohlenstoffdisulfid", "75-15-0", "CS\u2082", 76.14, L2, "Schwefelverbindung / L\xF6semittel", "1131", ["GHS02", "GHS07", "GHS08"], "Gefahr", ["H225", "H315", "H319", "H361fd", "H372"], { synonyms: ["Schwefelkohlenstoff"], odor: "faulig-s\xFC\xDFlich (technisch)", bp: "46 \xB0C", mp: "\u2212111 \xB0C", dens: "1,26 g/cm\xB3 (schwerer als Wasser)", wsol: "gering", fire: "Flammpunkt ca. \u221230 \xB0C; sehr niedrige Z\xFCndtemperatur; Z\xFCndbereich ca. 1\u201350 Vol.-%", lel: 1, uel: 50, ie: 10.07, origins: ["industrie", "labor"] }),
  T("pyridin", "Pyridin", "110-86-1", "C\u2085H\u2085N", 79.1, L2, "Heteroaromat / L\xF6semittel", "1282", ["GHS02", "GHS07"], "Gefahr", ["H225", "H302", "H312", "H332", "H315", "H319"], { odor: "unangenehm, fischartig", bp: "115 \xB0C", mp: "\u221242 \xB0C", dens: "0,98 g/cm\xB3", wsol: "mischbar", fire: "Flammpunkt ca. 17 \xB0C", lel: 1.7, ie: 9.26, origins: ["labor", "industrie"] }),
  T("ethylenglykol", "Ethylenglykol", "107-21-1", "C\u2082H\u2086O\u2082", 62.07, L2, "Alkohol (Diol) / Frostschutzmittel", null, ["GHS07", "GHS08"], "Achtung", ["H302", "H373"], { synonyms: ["Glykol", "Frostschutz"], odor: "geruchlos, s\xFC\xDFlich", bp: "197 \xB0C", mp: "\u221213 \xB0C", dens: "1,11 g/cm\xB3", wsol: "mischbar", fire: "Flammpunkt ca. 111 \xB0C", ie: 10.16, origins: ["kuehlanlage", "haushalt", "werkstatt", "industrie"], notes: "Typisch in K\xFChlmitteln/Frostschutz; kein Gefahrgut der Klasse 3." }),
  // ---- Stickstoff-/Aromatenverbindungen, Giftstoffe
  T("phenol", "Phenol", "108-95-2", "C\u2086H\u2086O", 94.11, S2, "Aromatische Hydroxyverbindung / Kontaktgift", "1671 (fest) / 2312 (geschmolzen)", ["GHS05", "GHS06", "GHS08", "GHS09"], "Gefahr", ["H301", "H311", "H331", "H314", "H341", "H373", "H411"], { synonyms: ["Carbols\xE4ure", "Hydroxybenzol"], color: "farblos bis rosa", odor: "charakteristisch, s\xFC\xDFlich-teerartig", bp: "182 \xB0C", mp: "41 \xB0C", wsol: "ca. 80 g/L", ie: 8.51, fire: "Flammpunkt ca. 79 \xB0C", ph: "sauer", origins: ["industrie", "labor"], notes: "Wird \xFCber die Haut aufgenommen; Bet\xE4ubung der Haut kann Ver\xE4tzung kaschieren." }),
  T("anilin", "Anilin", "62-53-3", "C\u2086H\u2087N", 93.13, L2, "Aromatisches Amin / Blutgift", "1547", ["GHS06", "GHS08", "GHS09"], "Gefahr", ["H301", "H311", "H331", "H318", "H317", "H341", "H351", "H372", "H400"], { color: "farblos bis braun", odor: "charakteristisch, aminartig", bp: "184 \xB0C", mp: "\u22126 \xB0C", dens: "1,02 g/cm\xB3", wsol: "ca. 36 g/L", ie: 7.72, fire: "Flammpunkt ca. 70 \xB0C", origins: ["industrie", "labor"], notes: "Hautresorption; Meth\xE4moglobinbildung (blaue Lippen/Haut)." }),
  T("nitrobenzol", "Nitrobenzol", "98-95-3", "C\u2086H\u2085NO\u2082", 123.11, L2, "Nitroaromat / Blutgift", "1662", ["GHS06", "GHS08"], "Gefahr", ["H301", "H311", "H331", "H351", "H360F", "H372", "H412"], { color: "gelblich", odor: "bittermandelartig", bp: "211 \xB0C", mp: "5,7 \xB0C", dens: "1,20 g/cm\xB3 (schwerer als Wasser)", wsol: "ca. 2 g/L", ie: 9.86, fire: "Flammpunkt ca. 88 \xB0C", origins: ["industrie", "labor"], notes: "Hautresorption; Meth\xE4moglobinbildung." }),
  T("acrylnitril", "Acrylnitril", "107-13-1", "C\u2083H\u2083N", 53.06, L2, "Nitril / Monomer", "1093", ["GHS02", "GHS05", "GHS06", "GHS08", "GHS09"], "Gefahr", ["H225", "H301", "H311", "H331", "H315", "H318", "H335", "H317", "H350", "H411"], { odor: "schwach stechend, zwiebelartig", bp: "77 \xB0C", mp: "\u221284 \xB0C", dens: "0,81 g/cm\xB3", wsol: "ca. 70 g/L", fire: "Flammpunkt ca. \u22125 \xB0C; Z\xFCndbereich ca. 3\u201317 Vol.-%; kann explosionsartig polymerisieren", lel: 3, uel: 17, ie: 10.91, origins: ["industrie"], notes: "Brandgase enthalten Cyanwasserstoff." }),
  T("acrolein", "Acrolein", "107-02-8", "C\u2083H\u2084O", 56.06, L2, "Aldehyd / Reizstoff", "1092", ["GHS02", "GHS05", "GHS06", "GHS09"], "Gefahr", ["H225", "H300", "H310", "H330", "H314", "H400"], { odor: "stechend, bei\xDFend", bp: "53 \xB0C", mp: "\u221287 \xB0C", dens: "0,84 g/cm\xB3", wsol: "ca. 200 g/L", fire: "Flammpunkt ca. \u221226 \xB0C", lel: 2.8, uel: 31, ie: 10.1, origins: ["industrie", "brand"], notes: "Entsteht auch bei Fett-/\xD6lbr\xE4nden." }),
  T("hydrazin", "Hydrazin", "302-01-2", "N\u2082H\u2084", 32.05, L2, "Reduktionsmittel / Raketentreibstoff", "2029", ["GHS02", "GHS05", "GHS06", "GHS08", "GHS09"], "Gefahr", ["H226", "H301", "H311", "H331", "H314", "H317", "H350", "H410"], { odor: "ammoniakartig", bp: "114 \xB0C", mp: "2 \xB0C", dens: "1,0 g/cm\xB3", wsol: "mischbar", fire: "Flammpunkt ca. 38 \xB0C; Z\xFCndbereich weit", lel: 2.9, uel: 98, ie: 8.93, ph: "basisch", origins: ["industrie", "labor"] }),
  T("kaliumcyanid", "Kaliumcyanid", "151-50-8", "KCN", 65.12, S2, "Anorganisches Cyanid / Zellgift", "1680", ["GHS06", "GHS09"], "Gefahr", ["H300", "H310", "H330", "H410", "EUH032"], { synonyms: ["Cyankali"], color: "wei\xDF", odor: "schwach bittermandelartig (feucht)", mp: "634 \xB0C", wsol: "gut l\xF6slich", fire: "Nicht brennbar; setzt mit S\xE4uren/Feuchtigkeit Cyanwasserstoff frei", ph: "basisch", origins: ["industrie", "labor"], notes: "W\xE4ssrige L\xF6sungen basisch; Kontakt mit S\xE4uren setzt HCN frei." }),
  T("natriumcyanid", "Natriumcyanid", "143-33-9", "NaCN", 49.01, S2, "Anorganisches Cyanid / Zellgift", "1689", ["GHS06", "GHS09"], "Gefahr", ["H300", "H310", "H330", "H410", "EUH032"], { synonyms: ["Cyannatrium"], color: "wei\xDF", odor: "schwach bittermandelartig (feucht)", mp: "563 \xB0C", wsol: "gut l\xF6slich", fire: "Nicht brennbar; setzt mit S\xE4uren/Feuchtigkeit Cyanwasserstoff frei", ph: "basisch", origins: ["industrie", "labor"], notes: "Galvanik/Bergbau; Kontakt mit S\xE4uren setzt HCN frei." }),
  T("quecksilber", "Quecksilber", "7439-97-6", "Hg", 200.59, L2, "Schwermetall / Giftstoff", "2809", ["GHS06", "GHS08", "GHS09"], "Gefahr", ["H330", "H360D", "H372", "H410"], { color: "silbrig gl\xE4nzend", odor: "geruchlos", bp: "357 \xB0C", mp: "\u221238,8 \xB0C", dens: "13,5 g/cm\xB3 (sehr schwer)", wsol: "praktisch unl\xF6slich", ie: 10.44, fire: "Nicht brennbar", origins: ["labor", "haushalt", "industrie"], notes: "Verdampft bereits bei Raumtemperatur; Dampf giftig. Versch\xFCttetes Metall nicht saugen/kehren." }),
  // ---- Säuren / Laugen / Oxidationsmittel / Reaktive
  T("essigsaeure", "Essigs\xE4ure", "64-19-7", "C\u2082H\u2084O\u2082", 60.05, L2, "Organische S\xE4ure", "2789 (> 80 %)", ["GHS02", "GHS05"], "Gefahr", ["H226", "H314"], { synonyms: ["Ethans\xE4ure"], odor: "essigartig, stechend", bp: "118 \xB0C", mp: "16,6 \xB0C", dens: "1,05 g/cm\xB3", wsol: "mischbar", fire: "Flammpunkt ca. 40 \xB0C; Z\xFCndbereich ab ca. 4 Vol.-%", lel: 4, ie: 10.66, ph: "sauer", origins: ["haushalt", "industrie", "labor"] }),
  T("ameisensaeure", "Ameisens\xE4ure", "64-18-6", "CH\u2082O\u2082", 46.03, L2, "Organische S\xE4ure", "1779", ["GHS02", "GHS05", "GHS06"], "Gefahr", ["H226", "H302", "H314", "H331"], { odor: "stechend", bp: "101 \xB0C", mp: "8 \xB0C", dens: "1,22 g/cm\xB3", wsol: "mischbar", fire: "Flammpunkt ca. 69 \xB0C (konz.)", ie: 11.05, ph: "sauer", origins: ["landwirtschaft", "industrie", "labor"], notes: "Einstufung gehaltsabh\xE4ngig; Silierung/Imkerei/Entkalker." }),
  T("phosphorsaeure", "Phosphors\xE4ure", "7664-38-2", "H\u2083PO\u2084", 98, L2, "Anorganische S\xE4ure", "1805", ["GHS05"], "Gefahr", ["H290", "H314"], { odor: "geruchlos", bp: "ca. 158 \xB0C (85 %)", mp: "ca. 21 \xB0C (100 %)", dens: "ca. 1,69 g/cm\xB3 (85 %)", wsol: "mischbar", fire: "Nicht brennbar", ph: "sauer", origins: ["industrie", "haushalt", "landwirtschaft"] }),
  T("kaliumhydroxid", "Kaliumhydroxid", "1310-58-3", "KOH", 56.11, S2, "Anorganische Base", "1813 (fest) / 1814 (L\xF6sung)", ["GHS05", "GHS07"], "Gefahr", ["H290", "H302", "H314"], { synonyms: ["\xC4tzkali", "Kalilauge (L\xF6sung)"], color: "wei\xDF", odor: "geruchlos", mp: "ca. 360 \xB0C", bp: "ca. 1320 \xB0C", dens: "ca. 2,04 g/cm\xB3", wsol: "ca. 1100 g/L", fire: "Nicht brennbar", ph: "basisch", origins: ["industrie", "haushalt", "labor"] }),
  T("ammoniaklosung", "Ammoniakl\xF6sung (Salmiakgeist)", "1336-21-6", "NH\u2084OH (w\xE4ssrig)", null, L2, "Anorganische Base / Reiniger", "2672 (10\u201335 %)", ["GHS05", "GHS07", "GHS09"], "Gefahr", ["H314", "H335", "H400"], { synonyms: ["Salmiakgeist", "Ammoniakwasser"], odor: "stechend, ammoniakartig", dens: "ca. 0,9 g/cm\xB3", wsol: "mischbar", fire: "Nicht brennbar; Ammoniakgas entweicht", ph: "basisch", origins: ["haushalt", "labor", "industrie", "kuehlanlage"] }),
  T("natriumhypochlorit", "Natriumhypochlorit-L\xF6sung", "7681-52-9", "NaOCl (w\xE4ssrig)", 74.44, L2, "Oxidationsmittel / Bleich- und Desinfektionsmittel", "1791", ["GHS05", "GHS09"], "Gefahr", ["H290", "H314", "H400", "EUH031"], { synonyms: ["Chlorbleichlauge", "Javelwasser", "Chlorbleiche"], color: "gelblich-gr\xFCn", odor: "chlorartig", dens: "ca. 1,2 g/cm\xB3", wsol: "mischbar", fire: "Nicht brennbar; setzt mit S\xE4uren Chlorgas frei", ph: "basisch", oxidizer: true, origins: ["schwimmbad", "haushalt", "industrie"], notes: "Nie mit S\xE4uren oder Ammoniak-/Reinigerl\xF6sungen mischen (Chlor bzw. Chloramine)." }),
  T("wasserstoffperoxid", "Wasserstoffperoxid-L\xF6sung", "7722-84-1", "H\u2082O\u2082 (w\xE4ssrig)", 34.01, L2, "Oxidationsmittel", "2014 (20\u201360 %)", ["GHS03", "GHS05", "GHS07"], "Gefahr", ["H272", "H302", "H314", "H332"], { synonyms: ["Wasserstoffsuperoxid", "Peroxid"], color: "farblos", odor: "schwach stechend", dens: "ca. 1,1\u20131,2 g/cm\xB3", wsol: "mischbar", fire: "Nicht brennbar; stark brandf\xF6rdernd; zersetzt sich unter Sauerstoffbildung", ph: "sauer", oxidizer: true, origins: ["industrie", "labor", "haushalt", "schwimmbad"], notes: "Einstufung gehaltsabh\xE4ngig." }),
  T("ammoniumnitrat", "Ammoniumnitrat", "6484-52-2", "NH\u2084NO\u2083", 80.04, S2, "Oxidationsmittel / D\xFCngemittel", "1942 / 2067", ["GHS03", "GHS07"], "Achtung", ["H272", "H319"], { synonyms: ["Ammonsalpeter"], color: "wei\xDF", odor: "geruchlos", mp: "ca. 169 \xB0C", wsol: "ca. 1900 g/L", fire: "Nicht brennbar, brandf\xF6rdernd; kann bei Erhitzung/Einschluss explosionsartig zersetzen; Brandgase: nitrose Gase", oxidizer: true, origins: ["landwirtschaft", "industrie", "baustelle"] }),
  T("natriumchlorat", "Natriumchlorat", "7775-09-9", "NaClO\u2083", 106.44, S2, "Oxidationsmittel", "1495", ["GHS03", "GHS07", "GHS09"], "Gefahr", ["H271", "H302", "H411"], { color: "wei\xDF", odor: "geruchlos", mp: "ca. 248 \xB0C", wsol: "sehr gut l\xF6slich", fire: "Nicht brennbar; stark brandf\xF6rdernd; mit brennbaren Stoffen explosionsf\xE4hig", oxidizer: true, origins: ["landwirtschaft", "industrie"] }),
  T("kaliumpermanganat", "Kaliumpermanganat", "7722-64-7", "KMnO\u2084", 158.03, S2, "Oxidationsmittel", "1490", ["GHS03", "GHS05", "GHS09"], "Gefahr", ["H272", "H302", "H314", "H410"], { color: "violett", odor: "geruchlos", wsol: "ca. 64 g/L", fire: "Nicht brennbar; brandf\xF6rdernd", oxidizer: true, origins: ["labor", "industrie", "schwimmbad"] }),
  T("brom", "Brom", "7726-95-6", "Br\u2082", 159.81, L2, "Halogen / Oxidationsmittel", "1744", ["GHS05", "GHS06", "GHS09"], "Gefahr", ["H330", "H314", "H400"], { color: "rotbraun", odor: "stechend, erstickend", bp: "58,8 \xB0C", mp: "\u22127,2 \xB0C", dens: "3,1 g/cm\xB3 (sehr schwer)", wsol: "ca. 35 g/L", ie: 10.51, fire: "Nicht brennbar; oxidierend", oxidizer: true, origins: ["industrie", "labor", "schwimmbad"] }),
  T("calciumcarbid", "Calciumcarbid", "75-20-7", "CaC\u2082", 64.1, S2, "Wasserreaktiver Feststoff", "1402", ["GHS02"], "Gefahr", ["H260"], { color: "grau bis schwarz", odor: "knoblauchartig (feucht, durch Verunreinigungen)", fire: "Entwickelt mit Wasser Acetylen (hochentz\xFCndlich)", water_reactive: true, origins: ["baustelle", "werkstatt", "industrie"], notes: "Kein Wasser! Acetylen-Bildung bei Feuchtigkeit." }),
  T("natrium", "Natrium (Metall)", "7440-23-5", "Na", 22.99, S2, "Alkalimetall / wasserreaktiv", "1428", ["GHS02", "GHS05"], "Gefahr", ["H260", "H314", "EUH014"], { color: "silbrig, metallisch", odor: "geruchlos", mp: "97,8 \xB0C", bp: "883 \xB0C", dens: "0,97 g/cm\xB3", fire: "Reagiert heftig mit Wasser unter Wasserstoffbildung", water_reactive: true, ph: "basisch", origins: ["labor", "industrie"] }),
  T("calciumoxid", "Calciumoxid (Branntkalk)", "1305-78-8", "CaO", 56.08, S2, "Anorganische Base / wasserreaktiv (exotherm)", "1910", ["GHS05", "GHS07"], "Gefahr", ["H315", "H318", "H335"], { synonyms: ["Branntkalk", "Ungel\xF6schter Kalk"], color: "wei\xDF bis grau", odor: "geruchlos", mp: "ca. 2570 \xB0C", fire: "Nicht brennbar; reagiert mit Wasser stark exotherm (kann Brand entz\xFCnden)", water_reactive: true, ph: "basisch", origins: ["baustelle", "landwirtschaft", "industrie"] }),
  T("schwefel", "Schwefel", "7704-34-9", "S", 32.06, S2, "Brennbarer Feststoff", "1350", ["GHS07"], "Achtung", ["H315"], { color: "gelb", odor: "geruchlos (Verbrennung: SO\u2082)", mp: "115 \xB0C", bp: "445 \xB0C", dens: "ca. 2,0 g/cm\xB3", wsol: "unl\xF6slich", fire: "Brennbar (blaue Flamme); Verbrennung setzt Schwefeldioxid frei; Staub explosionsf\xE4hig", origins: ["industrie", "landwirtschaft"] })
];

// server/data/derive.ts
var ORIGIN_LABEL = {
  industrie: "Industrie / Chemiebetrieb",
  labor: "Labor / Forschung",
  tankwagen: "Gefahrguttransport (Stra\xDFe/Schiene)",
  tankstelle: "Tankstelle / Tanklager",
  schwimmbad: "Schwimmbad / Wasseraufbereitung",
  kuehlanlage: "K\xE4lteanlage / Eishalle / Brauerei",
  landwirtschaft: "Landwirtschaft (G\xFClle, Silo, D\xFCnger, Begasung)",
  haushalt: "Haushalt / Reiniger / Hobby",
  baustelle: "Baustelle / Bauchemie",
  werkstatt: "Werkstatt / Lackiererei / Schwei\xDFen",
  kanal: "Kanalisation / Kl\xE4r- / Biogasanlage",
  brand: "Brand / Brandrauch",
  wasser: "Gew\xE4sser / Wasser",
  verdaechtig: "Verd\xE4chtiger Fund / Verdacht auf vors\xE4tzliche Freisetzung",
  unbekannt: "Unbekannt"
};
var ORIGINS = {
  ammoniak: ["kuehlanlage", "landwirtschaft", "industrie"],
  chlor: ["schwimmbad", "industrie", "tankwagen"],
  schwefeldioxid: ["industrie", "brand", "landwirtschaft"],
  kohlenmonoxid: ["brand", "haushalt", "werkstatt", "industrie"],
  kohlendioxid: ["kuehlanlage", "landwirtschaft", "industrie", "kanal"],
  schwefelwasserstoff: ["kanal", "landwirtschaft", "industrie"],
  phosgen: ["industrie", "brand", "verdaechtig"],
  cyanwasserstoff: ["brand", "industrie", "verdaechtig"],
  benzol: ["tankstelle", "tankwagen", "industrie"],
  toluol: ["werkstatt", "industrie", "baustelle"],
  xylol: ["werkstatt", "baustelle", "industrie"],
  aceton: ["haushalt", "werkstatt", "labor"],
  methanol: ["industrie", "labor", "werkstatt"],
  ethanol: ["haushalt", "labor", "industrie"],
  isopropanol: ["haushalt", "labor", "werkstatt"],
  acetonitril: ["labor", "industrie"],
  formaldehyd: ["labor", "industrie", "haushalt"],
  salpetersaeure: ["industrie", "labor"],
  schwefelsaeure: ["industrie", "werkstatt", "labor"],
  salzsaeure: ["industrie", "schwimmbad", "haushalt", "baustelle"],
  natriumhydroxid: ["industrie", "haushalt", "labor"],
  sarin: ["verdaechtig"],
  soman: ["verdaechtig"],
  tabun: ["verdaechtig"],
  vx: ["verdaechtig"],
  schwefellost: ["verdaechtig"],
  stickstofflost: ["verdaechtig"],
  lewisit: ["verdaechtig"]
};
var num = (s) => {
  const m = s == null ? void 0 : s.match(/(\d+(?:[.,]\d+)?)/);
  return m ? parseFloat(m[1].replace(",", ".")) : null;
};
function deriveTraits(s) {
  const H = new Set(s.h);
  const has = (...c) => c.some((x) => H.has(x));
  const fire = s.fire_info ?? "";
  const flamH = has("H220", "H221", "H222", "H224", "H225", "H226", "H228", "H260");
  const flammable = flamH || /(?<!nicht )(?<!nicht\s)\bbrennbar|entzündbar/i.test(fire.replace(/nicht brennbar/gi, "")) ? true : s.h.length || /nicht brennbar/i.test(fire) ? false : null;
  const gas = s.state === "Gas";
  const toxic = has("H300", "H301", "H310", "H311", "H330", "H331") || s.subcategory === "CWA";
  const corrosive = has("H314", "H318");
  const oxidizer = !!s.oxidizer || has("H270", "H271", "H272");
  const wr = !!s.water_reactive || has("H260", "H261", "EUH014");
  const w = (s.water_solubility ?? "").toLowerCase();
  let solubility = null;
  if (/mischbar/.test(w)) solubility = "mischbar";
  else if (/reagiert/.test(w)) solubility = "reagiert";
  else if (/sehr gering|gering|unlöslich|praktisch/.test(w)) solubility = "gering";
  else if (/g\/l/.test(w)) solubility = (num(w) ?? 0) >= 50 ? "gut" : "gering";
  else if (/gut|sehr gut/.test(w)) solubility = "gut";
  const d = s.density ?? "";
  const dn = num(d);
  const floats = !gas && dn != null && /g\/cm/.test(d) ? dn < 1 : null;
  const M = s.molar_mass ?? (/gemisch/i.test(s.formula) ? 100 : null);
  const vapor_heavier = M == null ? null : M > 29;
  const bp = num(s.boiling_point);
  const states = [s.state];
  if (s.state === "Fl\xFCssigkeit" && bp != null && /°C/.test(s.boiling_point ?? "") && !/−/.test((s.boiling_point ?? "").slice(0, 1)) && bp < 30) states.push("Gas");
  if (s.state === "Feststoff" && (solubility === "mischbar" || solubility === "gut")) states.push("Fl\xFCssigkeit");
  let ph = s.ph ?? (/säure/i.test(s.substance_group) ? "sauer" : /base|lauge/i.test(s.substance_group) ? "basisch" : null);
  if (!ph && !corrosive && !oxidizer && !gas) ph = "neutral";
  const cwa = s.subcategory === "CWA";
  return {
    flammable,
    oxidizer,
    toxic,
    corrosive,
    water_reactive: wr,
    ph,
    floats,
    vapor_heavier,
    states,
    asphyxiant: gas && !toxic && !flammable && !oxidizer,
    cmr: has("H340", "H341", "H350", "H351", "H360D", "H360F", "H361d", "H361f", "H361fd"),
    aquatic: has("H400", "H410", "H411", "H412"),
    polar: /alkohol|keton|ether|ester|nitril|glykol|aldehyd/i.test(s.substance_group) || solubility === "mischbar" && flammable === true && !gas,
    solubility,
    cwa,
    nerve: cwa && /nerven/i.test(s.substance_group),
    blister: cwa && /haut/i.test(s.substance_group),
    origins: s.origins ?? ORIGINS[s.id] ?? [],
    lel: s.lel_vol,
    gas
  };
}
var uniq = (a) => [...new Set(a)];
function buildResponse(s, t) {
  const R2 = { gefahren: [], absperrung: [], schutz: [], brand: [], freisetzung: [], dekon: [], rettung: [], messen: [], hinweise: [] };
  const G3 = (...a) => R2.gefahren.push(...a), A = (...a) => R2.absperrung.push(...a), P = (...a) => R2.schutz.push(...a), B = (...a) => R2.brand.push(...a);
  const F = (...a) => R2.freisetzung.push(...a), D = (...a) => R2.dekon.push(...a), E = (...a) => R2.rettung.push(...a), M = (...a) => R2.messen.push(...a), N = (...a) => R2.hinweise.push(...a);
  const heavy = t.vapor_heavier === true, light = t.vapor_heavier === false;
  const H = new Set(s.h);
  if (t.cwa) {
    G3(
      t.nerve ? "Hochgiftiger Nervenkampfstoff: Wirkung \xFCber Atemwege und Haut (Dampf und Fl\xFCssigkeit)." : "Hochgiftiger Hautkampfstoff: Sch\xE4digung von Haut, Augen und Atemwegen, Wirkung kann mit Verz\xF6gerung (Stunden) eintreten.",
      t.nerve ? "Typische Anzeichen: Pupillenverengung, Speichelfluss/Schwitzen, Atemnot, Muskelzuckungen/Kr\xE4mpfe, Bewusstlosigkeit." : "Typische Anzeichen: Hautr\xF6tung und sp\xE4ter Blasenbildung, Augenreizung, Husten/Atemwegsreizung; zun\xE4chst oft kaum Schmerz.",
      "Verdacht auf vors\xE4tzliche Freisetzung: Polizei und Spezialkr\xE4fte einbinden, Tatort-/Beweissicherung beachten."
    );
    A("Weitr\xE4umig absperren (Richtwert \u2265 300 m, nach Lage/Spezialkr\xE4ften anpassen); Anfahrt mit Wind im R\xFCcken (aus Windrichtung), nicht in Senken/Tiefpunkte.", "Nur ABC-Erkundungs-/Spezialkr\xE4fte (Messtrupp, ggf. Analytische Task Force) im Gefahrenbereich; alle anderen au\xDFerhalb.");
    P("Vollschutz: gasdichter Chemikalienschutzanzug mit umluftunabh\xE4ngigem Atemschutz \u2013 ausschlie\xDFlich ausgebildete Kr\xE4fte.", "Keine Rettungs- oder Messversuche ohne geeignete Schutzausr\xFCstung.");
    B("L\xF6schma\xDFnahmen auf Umgebungsbrand abstimmen; L\xF6schwasser auffangen (kontaminiert).");
    F("Nicht in die Lache/Wolke fahren oder laufen; Austritt nur durch Spezialkr\xE4fte bek\xE4mpfen; L\xF6schwasser/Abwasser auffangen; Gew\xE4sser- und Kanalschutz.");
    D("Soforthilfe-Dekon: Betroffene ohne Verzug aus dem Gefahrenbereich, Kleidung vollst\xE4ndig entfernen (entfernt den gr\xF6\xDFten Teil der Kontamination), Haut mit viel Wasser und Seife abwaschen, Augen ausgiebig sp\xFClen.", "Einsatzkr\xE4fte/Ger\xE4te \xFCber Dekon-Strecke (Schwarz-/Wei\xDFbereich); Dekon-Abwasser auffangen.");
    E(t.nerve ? "Antidot-Therapie ausschlie\xDFlich durch Notarzt/Rettungsdienst nach Protokoll; Betroffene m\xF6glichst rasch dekontaminiert \xFCbergeben." : "\xC4rztliche Behandlung (Brandwunden-/Augenversorgung); Betroffene dekontaminiert \xFCbergeben; Giftinformationszentrum.", "Rettung nur mit Eigenschutz (GAMS: Gefahr erkennen \u2013 Absperren \u2013 Menschenrettung \u2013 Spezialkr\xE4fte).");
    M("IMS und Kampfstoff-Pr\xFCfr\xF6hrchen = Screening; Best\xE4tigung durch Labor (Probenahme gem\xE4\xDF BBK-/Landesvorgaben). Messwerte, Zeit, Position und Wetter dokumentieren.");
    N("Identifikation erst nach Laborbefund best\xE4tigt. Alle Angaben: Richtwerte, QUELLE ERFORDERLICH \u2013 Einsatzleitung/Spezialkr\xE4fte entscheiden.");
    return finish(R2, s, t);
  }
  if (t.toxic) G3(`Giftig${H.has("H330") || H.has("H300") || H.has("H310") ? " bis lebensgef\xE4hrlich" : ""} (${[H.has("H330") || H.has("H331") ? "Einatmen" : "", H.has("H310") || H.has("H311") ? "Hautkontakt" : "", H.has("H300") || H.has("H301") ? "Verschlucken" : ""].filter(Boolean).join(", ")}).`);
  if (t.gas) G3(heavy ? "Gas schwerer als Luft: sammelt sich in Senken, Kellern, Sch\xE4chten, Kan\xE4len." : light ? "Gas leichter als Luft: steigt auf, sammelt sich in geschlossenen R\xE4umen unter der Decke." : "Ausbreitung abh\xE4ngig von Dichte und Wetter beachten.");
  if (t.gas && !t.asphyxiant) G3("Druckgasbeh\xE4lter: bei Erw\xE4rmung Bersten/Abrei\xDFen m\xF6glich; Gasaustritt kann kalt sein (K\xE4lteverbrennung).");
  if (t.asphyxiant) G3("Verdr\xE4ngt Sauerstoff: Erstickungsgefahr besonders in geschlossenen/tiefliegenden R\xE4umen \u2013 O\u2082-Messung vor Betreten.");
  if (t.flammable) G3(t.gas ? `Entz\xFCndbares Gas${s.lel_vol ? ` (UEG ca. ${String(s.lel_vol).replace(".", ",")} Vol.-%)` : ""}: explosionsf\xE4hige Gemische mit Luft.` : `Entz\xFCndbare Fl\xFCssigkeit${heavy ? " \u2013 D\xE4mpfe schwerer als Luft, breiten sich am Boden aus und z\xFCnden zur\xFCck" : ""}; explosionsf\xE4hige Dampf-Luft-Gemische.`);
  if (t.oxidizer) G3("Brandf\xF6rdernd: verst\xE4rkt Br\xE4nde, Kontakt mit brennbaren Stoffen (\xD6l, Fett, Holz, Textilien) vermeiden.");
  if (t.water_reactive) G3("Reagiert mit Wasser (W\xE4rme, entz\xFCndbare Gase) \u2013 kein Wasser auf den Stoff.");
  if (t.corrosive) G3("\xC4tzend: schwere Haut- und Augensch\xE4den; D\xE4mpfe/Aerosole sch\xE4digen Atemwege.");
  if (t.cmr) G3("Krebserzeugend/erbgutver\xE4ndernd/fortpflanzungsgef\xE4hrdend (einzelne Einstufungen): Exposition minimieren, Kontamination nicht verschleppen.");
  if (t.aquatic) G3("Wassergef\xE4hrdend: Eintrag in Kanalisation und Gew\xE4sser verhindern.");
  if (s.id === "ammoniak" || s.id === "chlor" || s.id === "schwefelwasserstoff" || s.id === "phosgen") G3("Hohe Konzentrationen f\xFChren schnell zu Bewusstlosigkeit/Lungensch\xE4den; verz\xF6gertes Lungen\xF6dem m\xF6glich.");
  if (!R2.gefahren.length) G3("Keine besonderen Einstufungsgefahren hinterlegt \u2013 NICHT VERF\xDCGBAR, Sicherheitsdatenblatt pr\xFCfen.");
  if (t.gas && (t.toxic || t.oxidizer)) A("Erst-Gefahrenbereich weitr\xE4umig (Richtwert \u2265 100 m, bei Beh\xE4lterversagen/gro\xDFen Mengen deutlich mehr), quer zur Windrichtung beginnen, anschlie\xDFend nach Messung anpassen.", "Anfahrt/Aufstellung mit Wind im R\xFCcken (Wind kommt aus R\xFCckseite), nicht in Senken stellen.");
  else if (t.gas && t.flammable) A("Gefahrenbereich \u2265 100 m (Richtwert), Z\xFCndquellen im Bereich ausschalten (kein Funkenflug, keine Elektrik), Ex-Messung (EX/UEG) vor jedem Vordringen.");
  else if (t.gas) A("Gefahrenbereich \u2265 50 m (Richtwert); geschlossene/tiefliegende R\xE4ume erst nach O\u2082-Messung betreten.");
  else if (t.flammable) A("Gefahrenbereich \u2265 50 m (Richtwert); Z\xFCndquellen ausschalten, Ex-Messung, Funkenarme Ger\xE4te; D\xE4mpfe am Boden beachten.");
  else if (t.toxic || t.corrosive) A("Gefahrenbereich \u2265 25\u201350 m (Richtwert, Lage/Menge/Messung ma\xDFgeblich).");
  else A("Gefahrenbereich nach Lage und Messung festlegen (Richtwert \u2265 25 m).");
  A("Unbeteiligte evakuieren bzw. Geb\xE4ude schlie\xDFen (L\xFCftung/Klima aus), Absperrung nach Windrichtung und Messwerten laufend anpassen.");
  if (t.gas && t.toxic) P("Umluftunabh\xE4ngiger Atemschutz und gasdichter Chemikalienschutzanzug (Form 3) \u2013 ausschlie\xDFlich daf\xFCr ausgebildete Kr\xE4fte (Chemikalienschutzanzug-Tr\xE4ger).");
  else if (t.corrosive || t.toxic) P("Umluftunabh\xE4ngiger Atemschutz bei D\xE4mpfen/Aerosolen, Chemikalienschutzkleidung (Spritzschutz bis gasdicht je nach Lage), Schutzhandschuhe, Gesichtsschutz.");
  else if (t.flammable) P("Feuerwehr-Einsatzkleidung, Atemschutz bei D\xE4mpfen/Brandrauch; Ex-gesch\xFCtzte Ger\xE4te und Beleuchtung.");
  else P("Standard-Einsatzkleidung; bei Staub/D\xE4mpfen Atemschutz; Hautkontakt vermeiden.");
  if (t.oxidizer) P("Keine \xF6l-/fettverschmutzte Kleidung und Ausr\xFCstung im Bereich (Entz\xFCndungsgefahr).");
  if (t.asphyxiant) P("Atemschutz (umluftunabh\xE4ngig) beim Betreten sauerstoffverdr\xE4ngter Bereiche; Sicherungsposten.");
  if (t.cmr) P("Kontakt konsequent vermeiden; Kontamination nicht in Fahrzeuge/Aufenthaltsr\xE4ume verschleppen.");
  if (t.water_reactive) B("KEIN Wasser, KEIN Schaum; trockene L\xF6schmittel (Metallbrandpulver, trockener Sand/L\xF6schpulver). Ggf. kontrolliert abbrennen lassen, Umgebung sch\xFCtzen.", "Beh\xE4lter nicht \xF6ffnen; Brandrauch kann \xE4tzend/giftig sein.");
  else if (t.gas && t.flammable) B("Brennendes Gas nur l\xF6schen, wenn der Gasaustritt sofort gestoppt werden kann (sonst Gefahr der R\xFCckz\xFCndung/Explosion) \u2013 Flamme kontrolliert brennen lassen.", "Beh\xE4lter aus Deckung mit Spr\xFChstrahl k\xFChlen; Beh\xE4lterexplosion (BLEVE) beachten.");
  else if (t.flammable && t.polar) B("Alkoholbest\xE4ndiger Schaum, Pulver oder CO\u2082; Beh\xE4lter mit Spr\xFChstrahl k\xFChlen; Vollstrahl vermeiden (Verschleppung).");
  else if (t.flammable) B("Schaum, Pulver oder CO\u2082; Beh\xE4lter/Umgebung mit Spr\xFChstrahl k\xFChlen; Wasser-Vollstrahl vermeiden (Verschleppung des brennenden Stoffs); L\xF6schwasser auffangen.");
  else if (t.oxidizer) B("Mit viel Wasser (Spr\xFChstrahl) k\xFChlen/l\xF6schen; Erstickungsl\xF6schmittel (CO\u2082, Schaum) sind weniger wirksam, da der Stoff Sauerstoff liefert; keine brennbaren Stoffe in Kontakt.");
  else B("Nicht brennbar: L\xF6schmittel auf die Umgebung abstimmen; Beh\xE4lter bei Brandeinwirkung k\xFChlen.");
  if (t.toxic || t.corrosive || /chlor|fluor|brom|nitr|cyan|schwefel|phosph/i.test(s.name + s.formula)) B("Brandgase k\xF6nnen giftig/\xE4tzend sein (z. B. HCl, NO\u2093, SO\u2082, HCN, Phosgen) \u2013 nur mit Atemschutz.");
  if (t.gas) F("Austritt nur stoppen, wenn gefahrlos m\xF6glich (z. B. Ventil schlie\xDFen); Beh\xE4lter in Windrichtung/ins Freie bringen nur durch Fachkr\xE4fte.", t.toxic ? "Gaswolke/D\xE4mpfe mit Spr\xFChstrahl niederschlagen bzw. verwirbeln, soweit wasserl\xF6slich/zweckm\xE4\xDFig; Abwasser auffangen." : "Bereich bel\xFCften, Gaskonzentration messen.");
  else if (t.water_reactive) F("Trocken aufnehmen (Schaufel, geeignetes Bindemittel), in trockene, dicht verschlie\xDFbare Beh\xE4lter; keinen Wasserzutritt.");
  else if (t.gas === false && s.state === "Feststoff") F("Staubentwicklung vermeiden, Versch\xFCttetes mechanisch aufnehmen oder befeuchten (au\xDFer wasserreaktiv), in geeignete Beh\xE4lter f\xFCllen.");
  else F("Leckage abdichten (wenn gefahrlos), Ausbreitung eind\xE4mmen, Kanaleinl\xE4ufe abdecken, mit geeignetem Bindemittel aufnehmen; gro\xDFe Mengen abpumpen.");
  if (t.flammable && !t.gas) F("Z\xFCndquellen vermeiden, funkenarme Ger\xE4te, Erdung beachten; Dampfbildung ggf. mit Schaumdecke mindern.");
  if (t.corrosive && t.ph === "sauer") F("S\xE4urebest\xE4ndige Bindemittel; Neutralisation nur nach Fachberatung/Anweisung der Einsatzleitung.");
  if (t.corrosive && t.ph === "basisch") F("Laugenbest\xE4ndige Bindemittel; Neutralisation nur nach Fachberatung/Anweisung der Einsatzleitung.");
  if (t.aquatic || t.floats === true) F(t.floats === true ? "Schwimmt auf Wasser: \xD6lsperren/\xD6lbindemittel einsetzen, Untere Wasserbeh\xF6rde informieren." : "Gew\xE4sserschutz: Untere Wasserbeh\xF6rde informieren.");
  if (t.floats === false && s.state === "Fl\xFCssigkeit" && t.solubility === "gering") F("Schwerer als Wasser und kaum l\xF6slich: sinkt ab \u2013 Gew\xE4ssereintrag besonders kritisch, Beh\xF6rde informieren.");
  F("Aufgenommenes Material und L\xF6schwasser als gef\xE4hrlichen Abfall entsorgen lassen.");
  if (t.toxic || t.corrosive || t.cmr) {
    D("Kontaminierte Personen: Kleidung entfernen, betroffene Haut mit reichlich Wasser sp\xFClen (mind. 10\u201315 min), Augen ausgiebig sp\xFClen.", "Einsatzkr\xE4fte/Ger\xE4te \xFCber Dekon-Strecke (Schwarz-/Wei\xDFbereich); Abwasser auffangen.");
    if (s.id === "fluorwasserstoff") D("Besonderheit Flusss\xE4ure: nach Sp\xFClung \xE4rztliche Behandlung zwingend (Calciumgluconat-Gel/Therapie nur durch Rettungsdienst/Arzt); Symptome oft verz\xF6gert.");
  } else D("Verunreinigte Kleidung wechseln, Haut mit Wasser und Seife reinigen; Ger\xE4te reinigen.");
  E("Eigenschutz vor Menschenrettung (GAMS-Regel: Gefahr erkennen \u2013 Absperren \u2013 Menschenrettung durchf\xFChren \u2013 Spezialkr\xE4fte anfordern).");
  if (t.toxic || t.corrosive || t.asphyxiant) E("Einatmen: Betroffene aus dem Gefahrenbereich an frische Luft, ruhig lagern, Rettungsdienst/Notarzt, Sauerstoffgabe durch Fachpersonal; Lungen\xF6dem kann verz\xF6gert auftreten.");
  E("Haut/Augen: reichlich Wasser; Verschlucken: Mund aussp\xFClen, kein Erbrechen ausl\xF6sen, \xE4rztliche Hilfe; Giftinformationszentrum kontaktieren.");
  if (s.id === "cyanwasserstoff" || s.id.includes("cyanid")) E("Cyanid-Vergiftung: Antidot-Gabe ausschlie\xDFlich durch Rettungsdienst/Notarzt.");
  if (s.id === "kohlenmonoxid") E("CO-Vergiftung: 100 % Sauerstoff durch Rettungsdienst; Betroffene auch bei guter Befindlichkeit \xE4rztlich untersuchen lassen.");
  if (s.id === "natrium" || s.id === "calciumcarbid") E("Hautkontakt mit Pulver/Partikeln: zuerst trocken abb\xFCrsten, dann mit viel Wasser sp\xFClen.");
  if (t.flammable) M("Ex-Messung (EX/UEG) mit MGMG vor dem Vordringen und w\xE4hrend des Einsatzes.");
  if (s.ie_ev != null && s.ie_ev < 10.6) M(`PID (10,6-eV-Lampe) spricht voraussichtlich an (IE ${String(s.ie_ev).replace(".", ",")} eV) \u2013 nur Screening.`);
  else if (s.ie_ev != null) M(`PID (10,6 eV) spricht voraussichtlich NICHT an (IE ${String(s.ie_ev).replace(".", ",")} eV).`);
  if (t.asphyxiant || t.gas && t.oxidizer) M("O\u2082-Kanal des MGMG (Sauerstoffmangel/-anreicherung).");
  if (s.devices.includes("Pr\xFCfr\xF6hrchen")) M("Pr\xFCfr\xF6hrchen f\xFCr den Messstoff (sofern im Inventar) zur orientierenden Best\xE4tigung.");
  if (t.ph && t.ph !== "neutral" && s.state !== "Gas") M("pH-Messung vor Ort (Indikatorpapier/Messger\xE4t) zur Einordnung.");
  M("Messpunkt, Zeit, Position, Windrichtung (kommt aus \u2026) und Messger\xE4t dokumentieren; Probenahme f\xFCr Laborbest\xE4tigung.");
  if (s.notes) N(s.notes);
  N("Alle Angaben sind klassenbasierte Richtwerte aus allgemeinen Einsatzgrunds\xE4tzen (GAMS-Regel, FwDV 500) \u2013 nicht stoffspezifisch gepr\xFCft (QUELLE ERFORDERLICH). Ma\xDFgeblich: Sicherheitsdatenblatt, GESTIS, ERG/Einsatzleiter-Wiki, Fachberatung. Simulations-/Rollenspielhilfe.");
  return finish(R2, s, t);
}
function finish(R2, _s, _t) {
  for (const k of Object.keys(R2)) R2[k] = uniq(R2[k]);
  return R2;
}
function radResponse(n) {
  const alpha = n.radiation.some((r) => /alpha/i.test(r)), beta = n.radiation.some((r) => /beta/i.test(r)), gamma = n.radiation.some((r) => /gamma/i.test(r));
  return {
    gefahren: [
      gamma ? "Gammastrahlung: durchdringend, \xE4u\xDFere Bestrahlung auch ohne Ber\xFChrung." : "",
      beta ? "Betastrahlung: Hautdosis/Augen bei Nahdistanz, Inkorporation gef\xE4hrlich." : "",
      alpha ? "Alphastrahlung: von au\xDFen kaum gef\xE4hrlich, bei Inkorporation (Einatmen/Verschlucken) sehr gef\xE4hrlich." : "",
      "Kontaminationsverschleppung (Staub, Fl\xFCssigkeit, Schuhe, Fahrzeuge) vermeiden."
    ].filter(Boolean),
    absperrung: ["Absperrung nach Dosisleistung und Einsatzvorschrift/Strahlenschutz-Fachberatung (Messwerte laufend aktualisieren); Messtrupp und Strahlenschutz einbinden.", "Unbeteiligte aus dem Bereich, Windrichtung beachten (Staub/Aerosole)."],
    schutz: ["4A-Regel: Abstand halten, Abschirmung nutzen, Aufenthaltszeit minimieren, Aktivit\xE4tsaufnahme (Inkorporation) verhindern.", "Pers\xF6nliches Dosimeter und Dosisleistungswarnger\xE4t; Schutzkleidung/Handschuhe/Atemschutz (bei Staub/Aerosol) \u2013 Kontaminationsschutz.", gamma ? "Abschirmung gegen Gamma: dichte Materialien (Blei, Beton, Stahl) \u2013 Wirkung begrenzt." : ""].filter(Boolean),
    brand: ["L\xF6schmittel auf Umgebungsbrand abstimmen; Brandrauch/L\xF6schwasser k\xF6nnen kontaminiert sein \u2013 Atemschutz, L\xF6schwasser auffangen."],
    freisetzung: ["Quelle nicht ber\xFChren; Bereich sichern; Strahlenschutz-Fachkr\xE4fte (z. B. ABC-Erkundung, Landesbeh\xF6rde) anfordern.", "Kontamination eingrenzen (abdecken, Staub binden), Abwasser auffangen."],
    dekon: ["Kontaminationskontrolle an Personen/Ger\xE4ten (z. B. CoMo 170 ZS-2), Kleidung ausziehen, Abduschen; Dekon-Abwasser auffangen; Dosisbuch f\xFChren."],
    rettung: ["Eigenschutz vor Menschenrettung; Verletzte zuerst retten und medizinisch versorgen, Dekon nachrangig, sofern keine lebensbedrohliche Kontamination.", "Rettungsdienst/Krankenhaus \xFCber m\xF6gliche Kontamination informieren."],
    messen: ["Dosisleistung (FMG/Dosisleistungsmessger\xE4t), Kontaminationsnachweis (CoMo 170 ZS-2), Gammaspektrometrie zur Nuklidzuordnung; Messpunkte georeferenziert dokumentieren."],
    hinweise: [`Halbwertszeit ${n.half_life}.`, "Richtwerte; QUELLE ERFORDERLICH \u2013 Strahlenschutz-Fachberatung/Einsatzvorschrift ma\xDFgeblich. Simulations-/Rollenspielhilfe."]
  };
}
function bioResponse(b) {
  return {
    gefahren: [`${b.kind}: biologische Gefahr \u2013 \xDCbertragung: ${b.transmission}.`, "Vor-Ort-Messger\xE4te k\xF6nnen biologische Gefahren allenfalls als Screening anzeigen; Best\xE4tigung nur im zust\xE4ndigen Labor."],
    absperrung: ["Bereich absperren, Zutritt beschr\xE4nken; keine Verschleppung (Personen, Fahrzeuge, Luft); L\xFCftung/Klima abschalten bei Innenr\xE4umen.", "Gesundheitsamt, Polizei und ggf. Landesbeh\xF6rden informieren."],
    schutz: ["Eigenschutz: Chemikalien-/Infektionsschutzkleidung, Handschuhe, Atemschutz (je nach Lage umluftunabh\xE4ngig/Partikelfilter) \u2013 Vorgaben der Fachberatung.", "Probenahme nur durch geschulte Kr\xE4fte."],
    brand: ["L\xF6schmittel auf Umgebungsbrand abstimmen; L\xF6schwasser auffangen."],
    freisetzung: ["Verd\xE4chtiges Material nicht ber\xFChren/aufwirbeln; abdecken, Bereich sichern; Spezialkr\xE4fte anfordern."],
    dekon: ["Dekon von Personen/Ger\xE4ten \xFCber Dekon-Strecke; Kleidung ablegen, Haut mit Wasser und Seife waschen; Desinfektion nach Vorgabe der Fachberatung; Abwasser auffangen."],
    rettung: ["Eigenschutz vor Menschenrettung; Betroffene isoliert halten, Rettungsdienst/Gesundheitsamt informieren; Kontaktpersonen erfassen."],
    messen: ["Probenahme und Transport nach BBK-/Landesvorgaben (Chain of Custody); Wetter und Position dokumentieren."],
    hinweise: ["Richtwerte; QUELLE ERFORDERLICH \u2013 Gesundheitsbeh\xF6rden/RKI-Fachinformation ma\xDFgeblich. Simulations-/Rollenspielhilfe."]
  };
}

// server/data/nuclides.ts
var radionuclides = [
  {
    id: "cs-137",
    name: "Cs-137",
    element: "Caesium",
    z: 55,
    a: 137,
    half_life: "30,05 a",
    half_life_s: 30.05 * 31557600,
    decay: "\u03B2\u207B",
    radiation: ["Beta", "Gamma (\xFCber Ba-137m)"],
    gamma_kev: [661.7],
    applications: "Kalibrierquellen, industrielle Messtechnik, Medizin (historisch)",
    occurrence: "Spaltprodukt; Fallout (z. B. Tschernobyl, Fukushima)",
    measurability: "Gammaspektrometrie, Dosisleistungsmessung",
    cbrn_category: "R",
    source_id: "iaea"
  },
  {
    id: "co-60",
    name: "Co-60",
    element: "Cobalt",
    z: 27,
    a: 60,
    half_life: "5,27 a",
    half_life_s: 5.2713 * 31557600,
    decay: "\u03B2\u207B",
    radiation: ["Beta", "Gamma"],
    gamma_kev: [1173.2, 1332.5],
    applications: "Strahlentherapie (historisch), Materialpr\xFCfung, Sterilisation",
    occurrence: "Neutronenaktivierung von Co-59",
    measurability: "Gammaspektrometrie, Dosisleistungsmessung",
    cbrn_category: "R",
    source_id: "iaea"
  },
  {
    id: "am-241",
    name: "Am-241",
    element: "Americium",
    z: 95,
    a: 241,
    half_life: "432,6 a",
    half_life_s: 432.6 * 31557600,
    decay: "\u03B1",
    radiation: ["Alpha", "Gamma (niederenergetisch)"],
    gamma_kev: [59.5],
    applications: "Ionisationsrauchmelder, Messtechnik",
    occurrence: "Zerfallsprodukt von Pu-241",
    measurability: "Kontaminationsmessung (\u03B1), Gammaspektrometrie (59,5 keV)",
    cbrn_category: "R",
    source_id: "iaea"
  },
  {
    id: "i-131",
    name: "I-131",
    element: "Iod",
    z: 53,
    a: 131,
    half_life: "8,02 d",
    half_life_s: 8.0207 * 86400,
    decay: "\u03B2\u207B",
    radiation: ["Beta", "Gamma"],
    gamma_kev: [364.5],
    applications: "Nuklearmedizin (Schilddr\xFCse)",
    occurrence: "Spaltprodukt; Reaktorunf\xE4lle",
    measurability: "Gammaspektrometrie",
    cbrn_category: "R",
    source_id: "iaea"
  },
  {
    id: "sr-90",
    name: "Sr-90",
    element: "Strontium",
    z: 38,
    a: 90,
    half_life: "28,8 a",
    half_life_s: 28.79 * 31557600,
    decay: "\u03B2\u207B",
    radiation: ["Beta (reiner \u03B2-Strahler; Tochter Y-90 ebenfalls \u03B2\u207B)"],
    gamma_kev: null,
    applications: "Radionuklidbatterien (historisch), Messtechnik",
    occurrence: "Spaltprodukt; Fallout",
    measurability: "Beta-Kontaminationsmessung; Nachweis i. d. R. labortechnisch",
    cbrn_category: "R",
    source_id: "iaea"
  },
  {
    id: "ra-226",
    name: "Ra-226",
    element: "Radium",
    z: 88,
    a: 226,
    half_life: "1600 a",
    half_life_s: 1600 * 31557600,
    decay: "\u03B1",
    radiation: ["Alpha", "Gamma"],
    gamma_kev: [186.2],
    applications: "Leuchtfarben (historisch), Medizin (historisch)",
    occurrence: "U-238-Zerfallsreihe; Altlasten",
    measurability: "Gammaspektrometrie, Radon-Folgeprodukte",
    cbrn_category: "R",
    source_id: "iaea"
  },
  {
    id: "ir-192",
    name: "Ir-192",
    element: "Iridium",
    z: 77,
    a: 192,
    half_life: "73,83 d",
    half_life_s: 73.83 * 86400,
    decay: "\u03B2\u207B / Elektroneneinfang",
    radiation: ["Beta", "Gamma"],
    gamma_kev: [316.5, 468.1, 308.5],
    applications: "Industrielle Durchstrahlungspr\xFCfung, Brachytherapie",
    occurrence: "Neutronenaktivierung von Ir-191",
    measurability: "Gammaspektrometrie, Dosisleistungsmessung",
    cbrn_category: "R",
    source_id: "iaea"
  },
  {
    id: "tc-99m",
    name: "Tc-99m",
    element: "Technetium",
    z: 43,
    a: 99,
    half_life: "6,01 h",
    half_life_s: 6.0067 * 3600,
    decay: "Isomerer \xDCbergang (IT)",
    radiation: ["Gamma"],
    gamma_kev: [140.5],
    applications: "Nuklearmedizinische Diagnostik",
    occurrence: "Generatorprodukt (Mo-99/Tc-99m)",
    measurability: "Gammaspektrometrie",
    cbrn_category: "R",
    source_id: "iaea"
  },
  {
    id: "k-40",
    name: "K-40",
    element: "Kalium",
    z: 19,
    a: 40,
    half_life: "1,248 \xB7 10\u2079 a",
    half_life_s: 1248e6 * 31557600,
    decay: "\u03B2\u207B (ca. 89 %) / Elektroneneinfang (ca. 11 %)",
    radiation: ["Beta", "Gamma"],
    gamma_kev: [1460.8],
    applications: "Keine technische Hauptanwendung",
    occurrence: "Nat\xFCrlich (Boden, Baustoffe, D\xFCngemittel, Lebensmittel)",
    measurability: "Gammaspektrometrie (typische Untergrundlinie)",
    cbrn_category: "R",
    source_id: "iaea"
  },
  {
    id: "u-238",
    name: "U-238",
    element: "Uran",
    z: 92,
    a: 238,
    half_life: "4,468 \xB7 10\u2079 a",
    half_life_s: 4468e6 * 31557600,
    decay: "\u03B1",
    radiation: ["Alpha"],
    gamma_kev: null,
    applications: "Kernbrennstoff-Kreislauf, abgereichertes Uran",
    occurrence: "Nat\xFCrlich; Erze",
    measurability: "Alpha-Spektrometrie / Labor; Gamma i. d. R. \xFCber Tochternuklide",
    cbrn_category: "N",
    source_id: "iaea"
  },
  {
    id: "u-235",
    name: "U-235",
    element: "Uran",
    z: 92,
    a: 235,
    half_life: "7,04 \xB7 10\u2078 a",
    half_life_s: 704e6 * 31557600,
    decay: "\u03B1",
    radiation: ["Alpha", "Gamma"],
    gamma_kev: [185.7],
    applications: "Kernbrennstoff",
    occurrence: "Nat\xFCrlich (ca. 0,72 % im Natururan)",
    measurability: "Gammaspektrometrie (185,7 keV)",
    cbrn_category: "N",
    source_id: "iaea"
  },
  {
    id: "pu-239",
    name: "Pu-239",
    element: "Plutonium",
    z: 94,
    a: 239,
    half_life: "24 110 a",
    half_life_s: 24110 * 31557600,
    decay: "\u03B1",
    radiation: ["Alpha"],
    gamma_kev: null,
    applications: "Kernbrennstoff / Kerntechnik",
    occurrence: "K\xFCnstlich (Reaktoren)",
    measurability: "Alpha-Kontaminationsmessung, Labor",
    cbrn_category: "N",
    source_id: "iaea"
  },
  {
    id: "th-232",
    name: "Th-232",
    element: "Thorium",
    z: 90,
    a: 232,
    half_life: "1,405 \xB7 10\xB9\u2070 a",
    half_life_s: 1405e7 * 31557600,
    decay: "\u03B1",
    radiation: ["Alpha"],
    gamma_kev: null,
    applications: "Gl\xFChstr\xFCmpfe (historisch), Legierungen",
    occurrence: "Nat\xFCrlich",
    measurability: "Gamma \xFCber Tochternuklide (Zerfallsreihe)",
    cbrn_category: "R",
    source_id: "iaea"
  }
];
var bioAgents = [
  { id: "b-anthracis", name: "Bacillus anthracis", kind: "Bakterium", disease: "Milzbrand (Anthrax)", properties: "Grampositives, sporenbildendes St\xE4bchenbakterium", transmission: "Hautkontakt, Einatmen von Sporen, Aufnahme \xFCber Nahrung", environmental_stability: "Sporen sehr umweltstabil", detection: "Labor: PCR, Kultur, Immunoassay; Vor-Ort nur Screening", lab_relevance: "Probenahme durch Fachkr\xE4fte, Transport als Gefahrgut, Untersuchung nur in daf\xFCr zugelassenen Laboren", risk_group: "RG 3", cbrn_category: "B", source_id: "rki" },
  { id: "y-pestis", name: "Yersinia pestis", kind: "Bakterium", disease: "Pest", properties: "Gramnegatives St\xE4bchenbakterium", transmission: "Flohstich, Tr\xF6pfchen (Lungenpest), Kontakt mit infiziertem Material", environmental_stability: "Au\xDFerhalb des Wirts begrenzt", detection: "Labor: PCR, Kultur, Immunoassay", lab_relevance: "Sonderlabor, Gefahrgut-Transport", risk_group: "RG 3", cbrn_category: "B", source_id: "rki" },
  { id: "f-tularensis", name: "Francisella tularensis", kind: "Bakterium", disease: "Tular\xE4mie (Hasenpest)", properties: "Gramnegatives, kokkoides St\xE4bchenbakterium", transmission: "Kontakt mit infizierten Tieren, Zecken, Aerosole", environmental_stability: "Feuchte, k\xFChle Umgebung: Wochen", detection: "Labor: PCR, Serologie, Kultur", lab_relevance: "Sonderlabor, Gefahrgut-Transport", risk_group: null, cbrn_category: "B", source_id: "rki", notes: "Risikogruppe je nach Subspezies \u2013 QUELLE ERFORDERLICH (TRBA 466)." },
  { id: "brucella", name: "Brucella spp.", kind: "Bakterium", disease: "Brucellose", properties: "Gramnegative, kokkoide St\xE4bchenbakterien", transmission: "Kontakt mit infizierten Tieren, Rohmilchprodukte, Aerosole", environmental_stability: "Wochen bis Monate in feuchter Umgebung", detection: "Labor: PCR, Kultur, Serologie", lab_relevance: "Sonderlabor, Laborinfektionsrisiko", risk_group: null, cbrn_category: "B", source_id: "rki", notes: "Risikogruppe artabh\xE4ngig \u2013 QUELLE ERFORDERLICH (TRBA 466)." },
  { id: "variola", name: "Variola-Virus", kind: "Virus", disease: "Pocken", properties: "Orthopockenvirus, DNA-Virus", transmission: "Tr\xF6pfchen/Aerosole, Kontakt", environmental_stability: "Relativ stabil in Krusten/Material", detection: "Labor: PCR (nur autorisierte Labore)", lab_relevance: "Weltweit nur in wenigen WHO-autorisierten Laboren; Erkrankung 1980 von der WHO f\xFCr ausgerottet erkl\xE4rt", risk_group: "RG 4", cbrn_category: "B", source_id: "who" },
  { id: "ebola", name: "Ebola-Virus", kind: "Virus", disease: "Ebolafieber", properties: "Filovirus, RNA-Virus", transmission: "Kontakt mit K\xF6rperfl\xFCssigkeiten", environmental_stability: "Au\xDFerhalb des Wirts begrenzt", detection: "Labor: RT-PCR, Antigennachweis", lab_relevance: "BSL-4-Labor, Spezialtransport", risk_group: "RG 4", cbrn_category: "B", source_id: "rki" },
  { id: "marburg", name: "Marburg-Virus", kind: "Virus", disease: "Marburg-Fieber", properties: "Filovirus, RNA-Virus", transmission: "Kontakt mit K\xF6rperfl\xFCssigkeiten", environmental_stability: "Au\xDFerhalb des Wirts begrenzt", detection: "Labor: RT-PCR, Antigennachweis", lab_relevance: "BSL-4-Labor, Spezialtransport", risk_group: "RG 4", cbrn_category: "B", source_id: "rki" },
  { id: "botulinum", name: "Botulinumtoxin", kind: "Toxin", disease: "Botulismus", properties: "Neurotoxin (Protein) von Clostridium botulinum", transmission: "Aufnahme \xFCber Nahrung, Wundbotulismus, (Aerosol)", environmental_stability: "Hitzeempfindlich, in Umwelt begrenzt stabil", detection: "Labor: Immunoassay, Massenspektrometrie, Tierversuchsersatzverfahren", lab_relevance: "Probenahme und Transport nur durch Fachkr\xE4fte", risk_group: null, cbrn_category: "B", source_id: "rki" },
  { id: "ricin", name: "Ricin", kind: "Toxin", disease: "Ricin-Intoxikation", properties: "Pflanzliches Proteintoxin (Ricinus communis)", transmission: "Aufnahme \xFCber Nahrung, Einatmen, Injektion", environmental_stability: "Relativ stabil als Feststoff", detection: "Labor: Immunoassay, Massenspektrometrie; Vor-Ort-Schnelltests nur als Screening", lab_relevance: "Probenahme und Transport nur durch Fachkr\xE4fte", risk_group: null, cbrn_category: "B", source_id: "who" }
];

// server/data/misc.ts
var sources = [
  { id: "bbk", name: "BBK \u2013 Bundesamt f\xFCr Bev\xF6lkerungsschutz und Katastrophenhilfe", document: "CBRN-Erkundungswagen; Mess- und Nachweistechnik; CBRN-Probenahme; Einsatztaktik CBRN; Informationen zur CBRN-Messleitkomponente", url: "https://www.bbk.bund.de", publisher_priority: 1 },
  { id: "gestis", name: "GESTIS-Stoffdatenbank (DGUV)", document: "Stoffdatens\xE4tze", url: "https://gestis.dguv.de", publisher_priority: 2 },
  { id: "baua", name: "BAuA", document: "Gefahrstoffinformationen", url: "https://www.baua.de", publisher_priority: 2 },
  { id: "echa", name: "ECHA \u2013 C&L Inventory", document: "Harmonisierte Einstufung (CLP)", url: "https://echa.europa.eu/information-on-chemicals/cl-inventory-database", publisher_priority: 3 },
  { id: "niosh", name: "NIOSH Pocket Guide to Chemical Hazards", document: "Ionisierungspotenziale", url: "https://www.cdc.gov/niosh/npg/", publisher_priority: 8 },
  { id: "opcw", name: "OPCW \u2013 Chemiewaffen\xFCbereinkommen", document: "Annex on Chemicals (Listen 1\u20133)", url: "https://www.opcw.org", publisher_priority: 8 },
  { id: "iaea", name: "IAEA \u2013 Nuclear Data Section", document: "Live Chart of Nuclides", url: "https://www-nds.iaea.org/relnsd/vcharthtml/VChartHTML.html", publisher_priority: 5 },
  { id: "who", name: "WHO", document: "Fachinformationen", url: "https://www.who.int", publisher_priority: 6 },
  { id: "rki", name: "Robert Koch-Institut", document: "Steckbriefe / Erregerinformationen", url: "https://www.rki.de", publisher_priority: 8 },
  { id: "nist", name: "NIST Chemistry WebBook", document: "Stoffdaten", url: "https://webbook.nist.gov", publisher_priority: 7 }
];
var devices = [
  { id: "ims", short: "IMS", name: "Ionenmobilit\xE4tsspektrometer", kind: "chemisch", description: "Chemisches Screening \xFCber Ionenmobilit\xE4t; liefert Hinweise auf Stoffklassen/Stoffe.", unit: null, source_id: "bbk" },
  { id: "como", short: "CoMo 170 ZS-2", name: "Kontaminationsnachweisger\xE4t CoMo 170 ZS-2", kind: "radiologisch", description: "Radiologischer Kontaminationsnachweis.", unit: "cps", source_id: "bbk" },
  { id: "dlm", short: "DLM", name: "Dosisleistungsmessger\xE4t", kind: "radiologisch", description: "Radiologische Messung der Dosisleistung.", unit: "\xB5Sv/h", source_id: "bbk" },
  { id: "pid", short: "PID", name: "Photoionisationsdetektor", kind: "chemisch", description: "Summenanzeige fl\xFCchtiger organischer Verbindungen (VOC). Screening \u2013 keine sichere Stoffidentifikation.", unit: "ppm", source_id: "bbk" },
  { id: "fmg", short: "FMG", name: "Fahrzeuggesteuertes Messsystem Gamma", kind: "radiologisch", description: "Kontinuierliche, georeferenzierte Gamma-Dosisleistungsmessung w\xE4hrend der Fahrt.", unit: "\xB5Sv/h", source_id: "bbk" },
  { id: "mgmg", short: "MGMG", name: "Mehrgasmessger\xE4t", kind: "chemisch", description: "Mehrkanalige Gasmessung (Kan\xE4le konfigurierbar).", unit: null, source_id: "bbk" },
  { id: "tubes", short: "Pr\xFCfr\xF6hrchen", name: "Kurzzeit-Pr\xFCfr\xF6hrchensatz", kind: "chemisch", description: "Chemische Messung \xFCber Pr\xFCfr\xF6hrchen (Inventar-/Informationsfunktion).", unit: "ppm", source_id: "bbk" }
];
var methods = [
  { id: "m-pid", name: "PID-Screening", description: "Photoionisation; Ansprechen abh\xE4ngig von Ionisierungsenergie und Lampe (hier 10,6 eV)." },
  { id: "m-ims", name: "IMS-Screening", description: "Ionenmobilit\xE4tsspektrometrie; Hinweis auf Stoffe/Stoffklassen." },
  { id: "m-tubes", name: "Pr\xFCfr\xF6hrchen", description: "Kolorimetrische Kurzzeit-Pr\xFCfr\xF6hrchen." },
  { id: "m-echem", name: "Elektrochemischer Sensor", description: "Gasspezifische Sensorkan\xE4le (MGMG)." },
  { id: "m-ph", name: "pH-Messung", description: "Vor-Ort-Bestimmung des pH-Werts von Fl\xFCssigkeiten." },
  { id: "m-gamma", name: "Gammaspektrometrie", description: "Energieaufgel\xF6ste Gammamessung zur Nuklidzuordnung." },
  { id: "m-dose", name: "Dosisleistungsmessung", description: "Ortsdosisleistung in \xB5Sv/h." },
  { id: "m-lab", name: "Laboranalytik", description: "GC-MS, LC-MS, PCR, Immunoassay u. a. \u2013 im Labor." }
];
var tubes = [
  ["Dr\xE4ger", "Chlor 0,2/a", "Kurzzeit", "Chlor", "7782-50-5"],
  ["Dr\xE4ger", "Ammoniak 5/a", "Kurzzeit", "Ammoniak", "7664-41-7"],
  ["Dr\xE4ger", "Schwefelwasserstoff 0,2/a", "Kurzzeit", "Schwefelwasserstoff", "7783-06-4"],
  ["Dr\xE4ger", "Kohlenmonoxid 2/a", "Kurzzeit", "Kohlenmonoxid", "630-08-0"],
  ["Dr\xE4ger", "Schwefeldioxid 0,5/a", "Kurzzeit", "Schwefeldioxid", "7446-09-5"],
  ["Dr\xE4ger", "Blaus\xE4ure 2/a", "Kurzzeit", "Cyanwasserstoff", "74-90-8"],
  ["Dr\xE4ger", "Phosgen 0,05/a", "Kurzzeit", "Phosgen", "75-44-5"],
  ["Dr\xE4ger", "Benzol 0,5/a", "Kurzzeit", "Benzol", "71-43-2"],
  ["Dr\xE4ger", "Toluol 50/a", "Kurzzeit", "Toluol", "108-88-3"],
  ["Dr\xE4ger", "Kohlendioxid 0,1%/a", "Kurzzeit", "Kohlendioxid", "124-38-9"]
].map(([manufacturer, product, tube_type, analyte, cas], i) => ({
  id: `T-${String(i + 1).padStart(3, "0")}`,
  manufacturer,
  product,
  tube_type,
  analyte,
  cas,
  range_text: null,
  unit: "ppm",
  application: "Orientierende Messung im Gasraum (Inventarfunktion)",
  storage_status: i === 6 ? "Nachbestellen" : "Verf\xFCgbar",
  lot: `SIM-${2400 + i * 7}`,
  expiry: `${2027 + i % 3}-0${1 + i % 9}-30`
}));
var vehicles = [
  { id: "FFW-11-71-01", name: "Florian Falkenwalde 11-71-01", status: "EINSATZBEREIT", link: "OFFLINE", online: 1, lat: 0, lon: 0, heading: 90, speed: 0, gps_fix: 0, power: "OK" },
  { id: "FFW-01-71-01", name: "Florian Falkenwalde 01-71-01", status: "EINSATZBEREIT", link: "OFFLINE", online: 1, lat: 0, lon: 0, heading: 90, speed: 0, gps_fix: 0, power: "OK" }
];

// server/geo.ts
var MODE = config.mapMode;
var CENTER = MODE === "gta5" ? { lat: config.gta5.center.y / 111320, lon: config.gta5.center.x / 111320 } : { ...config.geo.center };
var gameToLL = (x, y) => ({ lat: y / 111320, lon: x / 111320 });
var R = 6371e3;
var rad = (d) => d * Math.PI / 180;
var mPerDegLat = 111320;
var mPerDegLon = (lat) => MODE === "gta5" ? 111320 : 111320 * Math.cos(rad(lat));
var offsetToLL = (xEast, yNorth, c = CENTER) => ({ lat: c.lat + yNorth / mPerDegLat, lon: c.lon + xEast / mPerDegLon(c.lat) });
var llToOffset = (lat, lon, c = CENTER) => ({ x: (lon - c.lon) * mPerDegLon(c.lat), y: (lat - c.lat) * mPerDegLat });
function distM(a, b) {
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
var bearing = (a, b) => {
  const y = Math.sin(rad(b.lon - a.lon)) * Math.cos(rad(b.lat));
  const x = Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) - Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lon - a.lon));
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
};
var DIRS = ["N", "NNO", "NO", "ONO", "O", "OSO", "SO", "SSO", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
var compass = (deg) => DIRS[Math.round((deg % 360 + 360) % 360 / 22.5) % 16];
var SECTORS = {
  NORD: { name: "SEKTOR NORD", cx: 0, cy: 600 },
  OST: { name: "SEKTOR OST", cx: 600, cy: 0 },
  SUED: { name: "SEKTOR S\xDCD", cx: 0, cy: -600 },
  WEST: { name: "SEKTOR WEST", cx: -600, cy: 0 },
  ZENTRUM: { name: "SEKTOR ZENTRUM", cx: 0, cy: 0 }
};
var sectorPolygon = (key) => {
  const s = SECTORS[key];
  const h = 300;
  const pts = [[-h, -h], [h, -h], [h, h], [-h, h], [-h, -h]].map(([x, y]) => {
    const p = offsetToLL(s.cx + x, s.cy + y);
    return [p.lon, p.lat];
  });
  return pts;
};

// server/seed.ts
function pFor(s) {
  const p = /* @__PURE__ */ new Set();
  if (s.ghs.includes("GHS02")) ["P210", "P233"].forEach((x) => p.add(x));
  if (s.ghs.includes("GHS06") || s.h.some((h) => h.startsWith("H33"))) ["P260", "P284", "P304+P340", "P310"].forEach((x) => p.add(x));
  if (s.ghs.includes("GHS05")) ["P280", "P303+P361+P353", "P305+P351+P338"].forEach((x) => p.add(x));
  if (s.ghs.includes("GHS04")) p.add("P403+P233");
  return [...p];
}
var REF_VERSION = 6;
function gestisIndex() {
  return gestis_index_default;
}
var CHECK_DATE = "2026-10-04";
function syncReference() {
  const gi = gestisIndex();
  const tubeCas = new Set(tubes.map((t) => t.cas));
  const tx = db.transaction(() => {
    var _a, _b, _c;
    for (const s of sources) insert("sources", { ...s, retrieved_at: s.id === "gestis" && Object.keys(gi).length ? CHECK_DATE : null, data_stand: s.id === "gestis" && Object.keys(gi).length ? "Stoffindex (CAS, Name, ZVG-Nr.)" : null }, true);
    for (const s of [...substances, ...substances2]) {
      const methodsAuto = [...s.ie_ev != null && s.ie_ev < 10.6 ? ["PID-Screening"] : [], ...tubeCas.has(s.cas) ? ["Pr\xFCfr\xF6hrchen"] : [], ...s.lel_vol ? ["Ex-Messung (MGMG)"] : [], ...s.ph === "sauer" || s.ph === "basisch" ? ["pH-Messung"] : [], "Laboranalytik"];
      const devicesAuto = [...s.ie_ev != null && s.ie_ev < 10.6 ? ["PID"] : [], ...s.lel_vol ? ["MGMG"] : [], ...s.ims_sim ? ["IMS"] : [], ...tubeCas.has(s.cas) ? ["Pr\xFCfr\xF6hrchen"] : []];
      const full = { ...s, methods: s.methods.length ? s.methods : methodsAuto, devices: s.methods.length || s.devices.length ? s.devices : devicesAuto };
      const traits = deriveTraits(full);
      insert("substances", { ...full, p: pFor(full), ims_sim: s.ims_sim ? 1 : 0, quality: ((_a = gi[s.id]) == null ? void 0 : _a.cas_match) ? "identity" : "unverified", last_checked: ((_b = gi[s.id]) == null ? void 0 : _b.cas_match) ? CHECK_DATE : null, gestis_zvg: ((_c = gi[s.id]) == null ? void 0 : _c.zvg) ?? null, traits, response: buildResponse(full, traits) }, true);
    }
    for (const r of radionuclides) insert("radionuclides", { ...r, quality: "unverified", response: radResponse(r) }, true);
    for (const b of bioAgents) insert("biological_agents", { ...b, quality: "unverified", response: bioResponse(b) }, true);
    for (const d of devices) insert("measurement_devices", d, true);
    for (const m of methods) insert("measurement_methods", m, true);
    for (const t of tubes) insert("test_tubes", t, true);
  });
  tx();
  setSetting("ref_version", REF_VERSION);
}
function migrateVehicles() {
  if (db.prepare("SELECT COUNT(*) c FROM vehicles WHERE id LIKE 'FFW-%'").get().c >= 2) return;
  db.exec("PRAGMA foreign_keys = OFF");
  for (const t of ["vehicles", "crew", "missions", "measurements", "samples", "sample_events", "alarms", "runs", "reports", "audit_log", "sessions"]) db.exec(`DELETE FROM ${t}`);
  db.exec("PRAGMA foreign_keys = ON");
  for (const v of vehicles) insert("vehicles", { ...v, ...offsetToLL(0, 0) });
}
function seedIfEmpty() {
  if (db.prepare("SELECT COUNT(*) c FROM sources").get().c > 0) {
    migrateVehicles();
    if (getSetting("ref_version", 0) < REF_VERSION) syncReference();
    return;
  }
  syncReference();
  const tx = db.transaction(() => {
    for (const v of vehicles) insert("vehicles", { ...v, ...offsetToLL(0, 0) });
    setSetting("mgmg_channels", ["O2", "CO", "H2S", "LEL", "CH4"]);
    setSetting("fivem_origin", { x: 0, y: 0, scale: 1 });
  });
  tx();
}

// server/sim.ts
var import_node_events = require("node:events");
var bus = new import_node_events.EventEmitter();
var emit = (type, payload) => bus.emit("event", { type, payload, ts: now() });
var BG = { dose: 0.09, o2: 20.9, co: 0.5, pid: 0.1, cps: 1.2 };
var PID_LAMP_EV = 10.6;
var rnd = (a = 1) => (Math.random() - 0.5) * 2 * a;
var gauss = () => (Math.random() + Math.random() + Math.random() + Math.random() - 2) / 0.58;
var ROUTE = Array.from({ length: 480 }, (_, i) => {
  const t = i / 480 * Math.PI * 2;
  return { x: 750 * Math.sin(t), y: 480 * Math.sin(2 * t) };
});
ROUTE.push(ROUTE[0]);
var CUM = [0];
for (let i = 1; i < ROUTE.length; i++) CUM.push(CUM[i - 1] + Math.hypot(ROUTE[i].x - ROUTE[i - 1].x, ROUTE[i].y - ROUTE[i - 1].y));
var routeLL = () => ROUTE.map((p) => {
  const l = offsetToLL(p.x, p.y);
  return [l.lon, l.lat];
});
function routePos(s) {
  const L3 = CUM[CUM.length - 1];
  s = (s % L3 + L3) % L3;
  let i = 1;
  while (CUM[i] < s) i++;
  const f = (s - CUM[i - 1]) / (CUM[i] - CUM[i - 1]);
  return { x: ROUTE[i - 1].x + (ROUTE[i].x - ROUTE[i - 1].x) * f, y: ROUTE[i - 1].y + (ROUTE[i].y - ROUTE[i - 1].y) * f };
}
var DEVICE_WARM = { pid: 25e3, ims: 4e4, mgmg: 3e4, dlm: 2e4, como: 25e3, fmg: 3e4 };
var devices2 = {};
function devState(vid, key) {
  var _a;
  const d = (_a = devices2[vid]) == null ? void 0 : _a[key];
  if (!(d == null ? void 0 : d.on)) return "off";
  return Date.now() - d.since >= (DEVICE_WARM[key] ?? 0) ? "ready" : "warmup";
}
function deviceInfo(vid) {
  var _a;
  const o = {};
  for (const k of Object.keys(DEVICE_WARM)) {
    const d = (_a = devices2[vid]) == null ? void 0 : _a[k];
    o[k] = { on: !!(d == null ? void 0 : d.on), elapsed_ms: (d == null ? void 0 : d.on) ? Date.now() - d.since : 0, warm_ms: DEVICE_WARM[k] };
  }
  return o;
}
function setDevicePower(by, vid, key, on2) {
  var _a;
  if (!(key in DEVICE_WARM)) return { error: "Unbekanntes Ger\xE4t" };
  const cur = (_a = devices2[vid]) == null ? void 0 : _a[key];
  if (on2 && (cur == null ? void 0 : cur.on)) return { devices: deviceInfo(vid) };
  if (!on2 && !(cur == null ? void 0 : cur.on)) return { devices: deviceInfo(vid) };
  (devices2[vid] ??= {})[key] = { on: on2, since: Date.now() };
  audit(by, on2 ? "power_on" : "power_off", "device", `${vid}/${key}`);
  emit("device.changed", { vehicle_id: vid, devices: deviceInfo(vid) });
  return { devices: deviceInfo(vid) };
}
function resetDevices() {
  for (const k of Object.keys(devices2)) delete devices2[k];
}
var state = {
  drive: process.env.DEV_DRIVE === "1",
  s: 0,
  s2: 0,
  speed: 12,
  seen: {},
  // m/s
  weather: { temperature: 11.4, humidity: 78, pressure: 1014, wind_speed: 3.4, wind_from: 315, cloud_okta: 5, precipitation: 0 },
  live: {},
  info: {},
  // letzte FiveM-Infos je Fahrzeug
  track: {},
  runs: {},
  gameWeather: null,
  cooldown: /* @__PURE__ */ new Map(),
  tick: 0
};
var fivemConnected = (id) => id ? Date.now() - (state.seen[id] ?? 0) < 1e4 : Object.values(state.seen).some((t) => Date.now() - t < 1e4);
var activeIncident = () => list("incidents", "WHERE status = 'AKTIV' ORDER BY created_at DESC LIMIT 1")[0] ?? null;
function activeScenario() {
  const inc = activeIncident();
  if (!inc) return null;
  const ref = inc.ref_type === "substance" ? get("substances", inc.ref_id) : inc.ref_type === "radionuclide" ? get("radionuclides", inc.ref_id) : get("biological_agents", inc.ref_id);
  const sc = { id: inc.id, name: inc.name, category: inc.ref_type === "radionuclide" ? "R" : inc.ref_type === "biological" ? "B" : "C", display: inc.category, ref_type: inc.ref_type, ref_id: inc.ref_id, radius_m: inc.radius_m, peak: inc.peak };
  return { sc, ref, src: llToOffset(inc.lat, inc.lon) };
}
function concAt(x, y, A, windFrom, t) {
  const { sc, src } = A;
  const th = (windFrom + 180) % 360 * (Math.PI / 180);
  const ux = Math.sin(th), uy = Math.cos(th);
  const dx = x - src.x, dy = y - src.y, along = dx * ux + dy * uy, cross = -dx * uy + dy * ux;
  const r = sc.radius_m, sx = along > 0 ? 0.75 * r : 0.1 * r, sy = 0.2 * r + Math.max(0, along) * 0.08;
  const turb = 1 + 0.18 * Math.sin(t / 7) + 0.08 * gauss();
  return sc.peak * Math.exp(-(along * along) / (2 * sx * sx) - cross * cross / (2 * sy * sy)) * Math.max(0.2, turb);
}
function truthAt(x, y) {
  const A = activeScenario();
  if (!A) return { c: 0, A };
  if (A.sc.category === "R") {
    const r = Math.hypot(x - A.src.x, y - A.src.y);
    return { c: A.sc.peak * (225 / Math.max(r * r, 225)) * (r > 3 * A.sc.radius_m ? 0 : 1), A };
  }
  if (A.sc.category === "B") return { c: 0, A };
  return { c: concAt(x, y, A, state.weather.wind_from, state.tick * 2), A };
}
var PID_GROUPS_AROM = ["Aromatische Kohlenwasserstoffe", "L\xF6semittel", "VOC-Gemische"];
function pidGroups(sub) {
  if (!sub) return ["Fl\xFCchtige organische Verbindungen (VOC)"];
  const g = (sub.substance_group ?? "").toLowerCase();
  if (g.includes("aromat")) return PID_GROUPS_AROM;
  if (g.includes("l\xF6semittel") || g.includes("alkohol") || g.includes("keton")) return ["L\xF6semittel", "Sauerstoffhaltige VOC", "VOC-Gemische"];
  return ["Anorganische/organische Verbindungen mit Ionisierungsenergie < 10,6 eV", "VOC-Gemische"];
}
function mgmgChannels() {
  return getSetting("mgmg_channels", ["O2", "CO", "H2S", "LEL", "CH4"]);
}
function readingsAt(x, y, speed) {
  const { c, A } = truthAt(x, y);
  const sc = A == null ? void 0 : A.sc, ref = A == null ? void 0 : A.ref;
  const chem = !!sc && (sc.category === "C" || sc.category === "U") && ref;
  const rad2 = !!sc && sc.category === "R";
  const ch = mgmgChannels();
  const pidResp = chem && ref.ie_ev != null && ref.ie_ev < PID_LAMP_EV;
  const pid = Math.max(0, BG.pid + rnd(0.05) + (pidResp ? c : 0));
  const isFlam = chem && ref.lel_vol;
  const mg = {
    O2: +(BG.o2 + rnd(0.05) - (chem ? c / 1e4 : 0)).toFixed(1),
    CO: +Math.max(0, BG.co + rnd(0.5) + (chem && ref.cas === "630-08-0" ? c : 0)).toFixed(0),
    H2S: +Math.max(0, chem && ref.cas === "7783-06-4" ? c : 0).toFixed(1),
    LEL: +Math.max(0, isFlam ? c / (ref.lel_vol * 1e4) * 100 : 0).toFixed(1),
    CH4: 0
  };
  const channels = Object.fromEntries(ch.map((k) => [k, mg[k] ?? null]));
  const ratio = chem ? c / sc.peak : 0;
  let ims = { state: "ONLINE", mode: "AKTIV", level: null, result: "KEIN TREFFER", confidence: null, substance_id: null, group: null, candidates: [] };
  if (chem && ref.ims_sim && ratio > 0.03) {
    const sameGroup = list("substances", "WHERE ims_sim = 1 AND id != ? AND substance_group = ?", [ref.id, ref.substance_group]).slice(0, 2);
    if (ratio < 0.15) ims = { ...ims, level: "hinweis", result: `HINWEIS \u2013 Stoffklasse: ${ref.substance_group}`, group: ref.substance_group };
    else if (ratio < 0.4) ims = { ...ims, level: "verdacht", result: `VERDACHT \u2013 ${ref.substance_group}`, group: ref.substance_group, candidates: [ref.id, ...sameGroup.map((s) => s.id)] };
    else ims = { ...ims, level: "moegliche_identifikation", result: "M\xD6GLICHER STOFF", confidence: Math.round(Math.min(0.95, 0.5 + ratio * 0.45) * 100), substance_id: ref.id, group: ref.substance_group, candidates: [ref.id, ...sameGroup.map((s) => s.id)] };
  }
  const dose = Math.max(0.03, BG.dose + rnd(0.012) + (rad2 ? c : 0));
  const cps = Math.max(0, BG.cps + gauss() * 0.5 + (rad2 ? c * 6 : 0));
  return {
    c,
    pid: { value: +pid.toFixed(2), unit: "ppm", groups: pid > 2 ? pidGroups(ref && pidResp ? ref : null) : [] },
    mgmg: { channels },
    ims,
    dose: { value: +dose.toFixed(3), unit: "\xB5Sv/h" },
    como: { value: +cps.toFixed(1), unit: "cps" },
    fmg: { speed_kmh: +(speed * 3.6).toFixed(0) }
  };
}
function spectrumAt(x, y) {
  var _a;
  const r = readingsAt(x, y, 0);
  const A = activeScenario();
  const N = 512, keV = 4;
  const excess = Math.max(0, r.dose.value - BG.dose);
  const lines = [[1460.8, 14]];
  if ((A == null ? void 0 : A.sc.category) === "R" && ((_a = A.ref) == null ? void 0 : _a.gamma_kev)) for (const e of A.ref.gamma_kev) lines.push([e, 160 * (excess / 0.5 + 0.05) ** 0.9]);
  const counts = Array.from({ length: N }, (_, i) => {
    const E = (i + 0.5) * keV;
    let v = 30 * Math.exp(-E / 500) + 2 + excess * 40 * Math.exp(-E / 700);
    for (const [e, a] of lines) {
      const sg = 0.07 * Math.sqrt(e * 661.7) / 2.355;
      v += a * Math.exp(-((E - e) ** 2) / (2 * sg * sg));
    }
    return Math.max(0, Math.round(v + gauss() * Math.sqrt(v)));
  });
  const nucs = list("radionuclides").filter((n) => {
    var _a2;
    return (_a2 = n.gamma_kev) == null ? void 0 : _a2.length;
  });
  const score = (e) => {
    const i = Math.round(e / keV - 0.5), w = 4;
    const peak = counts.slice(i - w, i + w + 1).reduce((a, b) => a + b, 0);
    const base = (counts.slice(i - 3 * w, i - w).reduce((a, b) => a + b, 0) + counts.slice(i + w + 1, i + 3 * w + 1).reduce((a, b) => a + b, 0)) / 2 * ((2 * w + 1) / (2 * w));
    return (peak - base) / Math.sqrt(Math.max(base, 1));
  };
  const ids = nucs.map((n) => ({ id: n.id, name: n.name, natural: n.id === "k-40", z: Math.min(...n.gamma_kev.map(score)), best: Math.max(...n.gamma_kev.map(score)), gamma_kev: n.gamma_kev })).filter((o) => o.z > 3).sort((a, b) => b.z - a.z);
  return { kev_per_channel: keV, counts, dose: r.dose.value, candidates: ids, simulated: true };
}
var seqNow = () => (db.prepare("SELECT MAX(seq) m FROM measurements").get().m ?? 0) + 1;
var mpId = (n) => "MP-" + String(n).padStart(6, "0");
function createAlarm(a, key) {
  const last = state.cooldown.get(key) ?? 0;
  if (Date.now() - last < 9e4) return null;
  state.cooldown.set(key, Date.now());
  const n = (db.prepare("SELECT COUNT(*) c FROM alarms").get().c ?? 0) + 1;
  const row = { id: "ALM-" + String(n).padStart(5, "0"), ts: now(), status: "OFFEN", ...a };
  insert("alarms", row);
  emit("alarm.created", row);
  return row;
}
function activeMissionFor(vehicle_id) {
  return list("missions", "WHERE vehicle_id = ? AND status IN ('IN BEARBEITUNG','ANGENOMMEN') ORDER BY created_at DESC LIMIT 1", [vehicle_id])[0];
}
function storeMeasurement(m, silent = false) {
  const seq = seqNow();
  const row = { id: mpId(seq), seq, ts: now(), data_source: "SIMULATED", ...m };
  insert("measurements", row);
  if (!silent) emit("measurement.created", row);
  return row;
}
var LEVEL_TXT = { hinweis: "Hinweis", verdacht: "Verdacht", moegliche_identifikation: "M\xF6gliche Identifikation", bestaetigt: "Best\xE4tigte Identifikation" };
var levelText = (l) => l ? LEVEL_TXT[l] : "\u2013";
function evaluateAndStore(v, pos, r, mission, forceRoutine) {
  var _a, _b, _c, _d;
  const base = { lat: pos.lat, lon: pos.lon, vehicle_id: v.id, mission_id: (mission == null ? void 0 : mission.id) ?? null, run_id: ((_a = state.runs[v.id]) == null ? void 0 : _a.id) ?? null, incident_id: ((_b = activeIncident()) == null ? void 0 : _b.id) ?? null };
  const rows = [];
  const throttle = state.tick % 3 === 0;
  const ok2 = (k) => devState(v.id, k) === "ready";
  if (ok2("pid") && r.pid.value >= 2 && throttle) rows.push({ ...base, device: "PID", value: r.pid.value, unit: "ppm", status: r.pid.value >= 50 ? "HOCH" : "ERH\xD6HT", level: "hinweis", headline: "Erh\xF6hte VOC-Anzeige (Screening)", candidates: r.pid.groups, remark: null });
  if (ok2("ims") && r.ims.level && throttle) rows.push({ ...base, device: "IMS", value: r.ims.confidence, unit: r.ims.confidence != null ? "%" : null, status: r.ims.level === "moegliche_identifikation" ? "AUSWERTUNG ERFORDERLICH" : "ERH\xD6HT", level: r.ims.level, headline: r.ims.result, substance_id: r.ims.level === "moegliche_identifikation" ? r.ims.substance_id : null, candidates: r.ims.candidates, remark: null });
  const ch = r.mgmg.channels;
  const bad = ch.O2 != null && ch.O2 < 19.5 || (ch.CO ?? 0) > 30 || (ch.H2S ?? 0) > 5 || (ch.LEL ?? 0) > 10;
  const raised = (ch.CO ?? 0) > 5 || (ch.H2S ?? 0) > 0.5 || (ch.LEL ?? 0) > 1;
  if (ok2("mgmg") && (bad || raised) && throttle) rows.push({ ...base, device: "MGMG", value: ch.LEL ?? null, unit: "%LEL", channels: ch, status: bad ? "ALARM" : "ERH\xD6HT", level: "hinweis", headline: bad ? "Grenzwert-/Alarmschwelle \xFCberschritten" : "Kanalanzeige erh\xF6ht", remark: null });
  if (ok2("dlm") && r.dose.value >= 0.3 && throttle) rows.push({ ...base, device: "DLM", value: r.dose.value, unit: "\xB5Sv/h", status: r.dose.value >= 1 ? "ALARM" : "ERH\xD6HT", level: "hinweis", headline: "Erh\xF6hte Dosisleistung", remark: null });
  if (ok2("fmg") && forceRoutine) rows.push({ ...base, device: "FMG", value: r.dose.value, unit: "\xB5Sv/h", status: "NORMAL", level: null, headline: "FMG-Routinemesspunkt", remark: null });
  const saved = rows.map((row) => storeMeasurement(row));
  for (const m of saved) {
    if (m.device === "IMS" && m.level === "moegliche_identifikation") {
      const s = get("substances", m.substance_id);
      createAlarm({ source: "IMS", category: "CHEMISCH", description: `IMS: m\xF6gliche Identifikation ${(s == null ? void 0 : s.name) ?? "?"}`, lat: m.lat, lon: m.lon, vehicle_id: v.id, measurement_id: m.id }, `${v.id}-ims`);
    }
    if (m.device === "MGMG" && m.status === "ALARM") createAlarm({ source: "MGMG", category: "CHEMISCH", description: "MGMG: Alarmschwelle \xFCberschritten", lat: m.lat, lon: m.lon, vehicle_id: v.id, measurement_id: m.id }, `${v.id}-mgmg`);
    if (m.device === "DLM" && m.status === "ALARM") createAlarm({ source: "DLM", category: ((_c = activeScenario()) == null ? void 0 : _c.sc.category) === "N" ? "NUKLEAR" : "RADIOLOGISCH", description: `Dosisleistung ${m.value} \xB5Sv/h`, lat: m.lat, lon: m.lon, vehicle_id: v.id, measurement_id: m.id }, `${v.id}-dlm`);
    if (m.device === "PID" && m.status === "HOCH") createAlarm({ source: "PID", category: ((_d = activeScenario()) == null ? void 0 : _d.sc.display) === "U" ? "UNBEKANNT" : "CHEMISCH", description: `PID-Screening HOCH (${m.value} ppm)`, lat: m.lat, lon: m.lon, vehicle_id: v.id, measurement_id: m.id }, `${v.id}-pid`);
  }
}
function weatherStep() {
  if (applyGameWeather()) return;
  const w = state.weather;
  w.wind_from = (w.wind_from + rnd(2.5) + 360) % 360;
  w.wind_speed = Math.max(0.3, Math.min(14, w.wind_speed + rnd(0.25)));
  w.temperature += rnd(0.05);
  w.humidity = Math.max(30, Math.min(100, w.humidity + rnd(0.4)));
  w.pressure += rnd(0.05);
  w.cloud_okta = Math.max(0, Math.min(8, Math.round(w.cloud_okta + rnd(0.3))));
  w.precipitation = w.cloud_okta >= 7 && w.humidity > 90 ? 0.4 : 0;
}
function weatherNow() {
  const w = state.weather;
  return { ts: now(), temperature: +w.temperature.toFixed(1), humidity: +w.humidity.toFixed(0), pressure: +w.pressure.toFixed(1), wind_speed: +w.wind_speed.toFixed(1), wind_from: +w.wind_from.toFixed(0), wind_from_text: compass(w.wind_from), cloud_okta: w.cloud_okta, precipitation: +w.precipitation.toFixed(1), data_source: "SIMULATED", game_weather: state.gameWeather && Date.now() - state.gameWeather.at < 2e4 ? state.gameWeather.type : null };
}
function ingestFivem(d) {
  var _a, _b, _c;
  const id = d.vehicle ?? ((_a = list("vehicles")[0]) == null ? void 0 : _a.id);
  const v = id ? get("vehicles", id) : null;
  if (!v) return false;
  const was = fivemConnected(id);
  if ((_b = d.weather) == null ? void 0 : _b.type) state.gameWeather = { type: String(d.weather.type).toUpperCase(), wind_speed: d.weather.wind_speed ?? 0, wind_from: d.weather.wind_from ?? 0, hour: d.weather.hour ?? 12, minute: d.weather.minute ?? 0, at: Date.now() };
  const hasPos = d.lat != null && d.lon != null || d.x != null && d.y != null;
  state.seen[id] = Date.now();
  if (hasPos) {
    let lat = d.lat, lon = d.lon;
    if (lat == null || lon == null) {
      if (MODE === "gta5") {
        const p = gameToLL(d.x ?? 0, d.y ?? 0);
        lat = p.lat;
        lon = p.lon;
      } else {
        const o = getSetting("fivem_origin", { x: 0, y: 0, scale: 1 });
        const p = offsetToLL(((d.x ?? 0) - o.x) * o.scale, ((d.y ?? 0) - o.y) * o.scale);
        lat = p.lat;
        lon = p.lon;
      }
    }
    update("vehicles", id, { lat, lon, heading: d.heading ?? v.heading, speed: d.speed_kmh ?? 0, online: 1, gps_fix: 1, link: "ONLINE", status: v.status === "OFFLINE" ? "EINSATZBEREIT" : v.status });
    emit("vehicle.position", get("vehicles", id));
  }
  const gw = state.gameWeather;
  state.info[id] = { player: d.player ?? ((_c = state.info[id]) == null ? void 0 : _c.player) ?? null, mission: d.mission ?? null, heading: d.heading ?? null, in_vehicle: d.in_vehicle ?? hasPos, game_weather: (gw == null ? void 0 : gw.type) ?? null, game_time: gw ? `${String(gw.hour).padStart(2, "0")}:${String(gw.minute).padStart(2, "0")}` : null };
  if (!was) emit("system.status", systemStatus());
  return true;
}
function runInfo(vehicleId) {
  const R2 = state.runs[vehicleId];
  return R2 ? { id: R2.id, name: R2.name, vehicle_id: R2.vehicle_id, started_at: R2.started_at, distance_m: Math.round(R2.dist), points: R2.points, source: R2.source, max_dose: R2.maxDose, max_pid: R2.maxPid, start: R2.start } : null;
}
function saveRun(R2) {
  const pts = db.prepare("SELECT COUNT(*) c FROM measurements WHERE run_id = ?").get(R2.id).c;
  R2.points = pts;
  update("runs", R2.id, { distance_m: Math.round(R2.dist), points: pts, max_dose: R2.maxDose, max_pid: R2.maxPid });
}
function startRun(userLabel, vehicleId, name, start) {
  if (state.runs[vehicleId]) return { error: "Auf diesem Fahrzeug l\xE4uft bereits eine Messfahrt" };
  const inc = activeIncident();
  if (!inc) return { error: "Kein aktiver Einsatz \u2013 bitte zuerst einen Einsatz anlegen" };
  if (!start || !Number.isFinite(start.lat) || !Number.isFinite(start.lon)) return { error: "Startposition fehlt \u2013 bitte den Standort auf der Karte markieren" };
  if (!fivemConnected(vehicleId)) {
    update("vehicles", vehicleId, { lat: start.lat, lon: start.lon, speed: 0 });
    emit("vehicle.position", get("vehicles", vehicleId));
  }
  const n = (db.prepare("SELECT COUNT(*) c FROM runs").get().c ?? 0) + 1;
  const mission = list("missions", "WHERE vehicle_id = ? AND status = 'IN BEARBEITUNG' LIMIT 1", [vehicleId])[0];
  const R2 = { id: "MF-" + String(n).padStart(4, "0"), vehicle_id: vehicleId, name: name || `Messfahrt ${n}`, started_at: now(), started_by: userLabel, dist: 0, points: 0, maxDose: 0, maxPid: 0, source: fivemConnected(vehicleId) ? "FIVEM" : "MANUELL", mission_id: (mission == null ? void 0 : mission.id) ?? null, start };
  state.runs[vehicleId] = R2;
  (state.track[vehicleId] ??= { len: 0, last: null }).last = null;
  insert("runs", { id: R2.id, vehicle_id: R2.vehicle_id, name: R2.name, started_at: R2.started_at, started_by: userLabel, distance_m: 0, points: 0, source: R2.source, mission_id: R2.mission_id, start_lat: start.lat, start_lon: start.lon, incident_id: inc.id });
  const dev = fivemConnected(vehicleId) ? Math.round(distM(start, { lat: get("vehicles", vehicleId).lat, lon: get("vehicles", vehicleId).lon })) : 0;
  audit(userLabel, "start", "run", R2.id, { source: R2.source, vehicle: vehicleId, start, deviation_m: dev });
  emit("run.started", runInfo(vehicleId));
  return { run: runInfo(vehicleId), deviation_m: dev };
}
function stopRun(userLabel, vehicleId) {
  const R2 = state.runs[vehicleId];
  if (!R2) return { error: "Auf diesem Fahrzeug l\xE4uft keine Messfahrt" };
  saveRun(R2);
  update("runs", R2.id, { ended_at: now() });
  delete state.runs[vehicleId];
  audit(userLabel, "stop", "run", R2.id, { distance_m: Math.round(R2.dist) });
  emit("run.stopped", get("runs", R2.id));
  return { run: get("runs", R2.id) };
}
var GTA_WX = {
  EXTRASUNNY: { t: 31, rh: 35, p: 1018, okta: 0, rain: 0 },
  CLEAR: { t: 26, rh: 45, p: 1016, okta: 1, rain: 0 },
  CLOUDS: { t: 22, rh: 60, p: 1013, okta: 5, rain: 0 },
  SMOG: { t: 24, rh: 55, p: 1012, okta: 4, rain: 0 },
  FOGGY: { t: 16, rh: 96, p: 1014, okta: 8, rain: 0 },
  OVERCAST: { t: 19, rh: 75, p: 1010, okta: 8, rain: 0 },
  RAIN: { t: 15, rh: 90, p: 1004, okta: 8, rain: 2.5 },
  THUNDER: { t: 16, rh: 92, p: 1e3, okta: 8, rain: 6 },
  CLEARING: { t: 18, rh: 80, p: 1008, okta: 6, rain: 0.4 },
  NEUTRAL: { t: 22, rh: 55, p: 1013, okta: 3, rain: 0 },
  SNOW: { t: -1, rh: 85, p: 1008, okta: 8, rain: 1 },
  BLIZZARD: { t: -6, rh: 88, p: 1002, okta: 8, rain: 3 },
  SNOWLIGHT: { t: 0, rh: 82, p: 1010, okta: 7, rain: 0.5 },
  XMAS: { t: 0, rh: 82, p: 1010, okta: 6, rain: 0 },
  HALLOWEEN: { t: 12, rh: 80, p: 1011, okta: 6, rain: 0 }
};
function applyGameWeather() {
  const g = state.gameWeather;
  if (!g || Date.now() - g.at > 2e4) return false;
  const m = GTA_WX[g.type] ?? GTA_WX.NEUTRAL;
  const w = state.weather;
  const diurnal = 4 * Math.sin((g.hour + g.minute / 60 - 9) / 24 * 2 * Math.PI);
  w.temperature = m.t + diurnal;
  w.humidity = Math.max(20, Math.min(100, m.rh - diurnal * 1.5));
  w.pressure = m.p;
  w.cloud_okta = m.okta;
  w.precipitation = m.rain;
  w.wind_speed = Math.max(0, g.wind_speed);
  w.wind_from = (g.wind_from % 360 + 360) % 360;
  return true;
}
function systemStatus() {
  var _a;
  const vehicles2 = {};
  for (const v of list("vehicles")) vehicles2[v.id] = { connected: fivemConnected(v.id), info: state.info[v.id] ?? null };
  const any = fivemConnected();
  const first = Object.values(vehicles2).find((x) => x.connected);
  return { web: "ONLINE", database: "ONLINE", api: "ONLINE", websocket: "ONLINE", fivem: any ? "CONNECTED" : "NOT CONNECTED", data_source: any ? "FIVEM" : "WARTET AUF FIVEM", fivem_info: (first == null ? void 0 : first.info) ?? null, vehicles: vehicles2, incident: ((_a = activeIncident()) == null ? void 0 : _a.id) ?? null };
}
var timer = null;
function startSim() {
  if (timer) return;
  setSetting("boot", now());
  timer = setInterval(() => {
    try {
      tick();
    } catch (e) {
      console.error("sim tick", e);
    }
  }, 2e3);
}
function tick() {
  state.tick++;
  const dt = 2;
  weatherStep();
  if (state.tick % 5 === 0) emit("weather.updated", weatherNow());
  if (state.tick % 30 === 0) {
    const w = weatherNow();
    db.prepare("INSERT INTO weather_records(ts,temperature,humidity,pressure,wind_speed,wind_from,cloud_okta,precipitation) VALUES(?,?,?,?,?,?,?,?)").run(w.ts, w.temperature, w.humidity, w.pressure, w.wind_speed, w.wind_from, w.cloud_okta, w.precipitation);
  }
  for (const v of list("vehicles")) {
    const live2 = fivemConnected(v.id) && Date.now() - (state.seen[v.id] ?? 0) < 15e3;
    const want = live2 ? "ONLINE" : "OFFLINE";
    if (v.link !== want) {
      update("vehicles", v.id, { link: want, gps_fix: live2 ? 1 : 0, speed: live2 ? v.speed : 0 });
      emit("vehicle.status", get("vehicles", v.id));
    }
  }
  const vehicles2 = list("vehicles");
  vehicles2.forEach((v, idx) => {
    let x, y, speed = 0;
    if (fivemConnected(v.id)) {
      ({ x, y } = llToOffset(v.lat, v.lon));
      speed = v.speed / 3.6;
    } else if (state.drive && idx === 0) {
      state.s += state.speed * dt;
      ({ x, y } = routePos(state.s));
      speed = state.speed;
      const ll = offsetToLL(x, y);
      const h = bearing({ lat: v.lat, lon: v.lon }, ll);
      update("vehicles", v.id, { lat: ll.lat, lon: ll.lon, heading: h, speed: speed * 3.6 });
    } else {
      ({ x, y } = llToOffset(v.lat, v.lon));
      if (v.speed) update("vehicles", v.id, { speed: 0 });
    }
    const cur = get("vehicles", v.id);
    const pos = { lat: cur.lat, lon: cur.lon };
    const r = readingsAt(x, y, speed);
    const T2 = state.track[v.id] ??= { len: 0, last: null };
    const R2 = state.runs[v.id];
    if (T2.last) {
      const dd = distM(T2.last, pos);
      T2.len += dd;
      if (R2) R2.dist += dd;
    }
    T2.last = pos;
    if (R2) {
      if (devState(v.id, "dlm") === "ready" || devState(v.id, "fmg") === "ready") R2.maxDose = Math.max(R2.maxDose, r.dose.value);
      if (devState(v.id, "pid") === "ready") R2.maxPid = Math.max(R2.maxPid, r.pid.value);
      if (state.tick % 5 === 0) saveRun(R2);
    }
    const payload = { vehicle_id: v.id, ts: now(), lat: pos.lat, lon: pos.lon, speed_kmh: +(speed * 3.6).toFixed(0), heading: cur.heading, ...r, track_km: +(T2.len / 1e3).toFixed(2), run: runInfo(v.id), devices: deviceInfo(v.id), mp_count: db.prepare("SELECT COUNT(*) c FROM measurements WHERE vehicle_id = ?").get(v.id).c };
    state.live[v.id] = payload;
    emit("reading.live", payload);
    emit("vehicle.position", cur);
    const mission = activeMissionFor(v.id);
    if (R2 || mission) evaluateAndStore(cur, pos, r, mission, !!R2 && state.tick % 2 === 0 && (speed > 0 || state.tick % 10 === 0));
  });
  for (const s of list("samples", "WHERE lab_status = 'ANALYSE' AND lab_result IS NULL")) {
    const age = (Date.now() - new Date(s.updated_at ?? s.ts).getTime()) / 1e3;
    if (age < 90) continue;
    completeLab(s.id, "SYSTEM");
  }
}
function completeLab(sampleId, by) {
  const s = get("samples", sampleId);
  if (!s) return null;
  const t = s.truth_ref;
  let res;
  if ((t == null ? void 0 : t.type) === "substance") {
    const sub = get("substances", t.id);
    res = { finding: "BEFUND", klass: (sub == null ? void 0 : sub.substance_group) ?? "NICHT VERF\xDCGBAR", substance_id: sub == null ? void 0 : sub.id, text: `${((sub == null ? void 0 : sub.substance_group) ?? "").toUpperCase()}`, simulated: true };
  } else if ((t == null ? void 0 : t.type) === "radionuclide") {
    const n = get("radionuclides", t.id);
    res = { finding: "BEFUND", klass: "RADIONUKLID", substance_id: null, nuclide_id: n == null ? void 0 : n.id, text: `Radionuklid ${n == null ? void 0 : n.name} (Gammaspektrometrie)`, simulated: true };
  } else if ((t == null ? void 0 : t.type) === "biological") {
    const b = get("biological_agents", t.id);
    res = { finding: "BEFUND", klass: "BIOLOGISCH", substance_id: null, bio_id: b == null ? void 0 : b.id, text: `${b == null ? void 0 : b.name} (PCR, Sonderlabor)`, simulated: true };
  } else res = { finding: "KEIN CBRN-RELEVANTER BEFUND", klass: null, text: "KEIN CBRN-RELEVANTER BEFUND", simulated: true };
  update("samples", sampleId, { lab_result: res, lab_status: "BEFUND EINGEGANGEN", updated_at: now() });
  db.prepare("INSERT INTO sample_events(sample_id,ts,status,note,by_user) VALUES(?,?,?,?,?)").run(sampleId, now(), "BEFUND EINGEGANGEN", "Laborergebnis", by);
  audit(by, "lab_result", "sample", sampleId, res);
  emit("sample.updated", get("samples", sampleId));
  return get("samples", sampleId);
}
function currentSnapshotAt(vehicleId) {
  const v = get("vehicles", vehicleId);
  const { x, y } = llToOffset(v.lat, v.lon);
  const r = readingsAt(x, y, 0);
  const { A } = truthAt(x, y);
  return { r, A, pos: { lat: v.lat, lon: v.lon }, truth: A && truthAt(x, y).c > A.sc.peak * 0.03 ? { type: A.sc.ref_type, id: A.sc.ref_id } : null };
}

// server/analysis.ts
var ODOR = {
  geruchlos: [],
  stechend: ["stechend", "bei\xDFend"],
  chlor: ["chlor"],
  ammoniak: ["ammoniak", "stechend"],
  faule_eier: ["faule eier"],
  suesslich: ["s\xFC\xDFlich", "fruchtig", "\xE4therisch"],
  alkohol: ["alkohol"],
  aromatisch: ["aromatisch", "benzin"],
  benzin: ["benzin", "aromatisch", "petroleum", "l\xF6semittel"],
  bittermandel: ["bittermandel"],
  knoblauch: ["knoblauch", "senf"],
  essig: ["essig"],
  oelig: ["\xF6lig", "petroleum"],
  heu: ["heu", "faulend"],
  l\u00F6semittel: ["l\xF6semittel", "fruchtig", "\xE4therisch"],
  teer: ["teer", "phenol", "charakteristisch"]
};
var SYMP = {
  augen: { h: ["H319", "H314", "H318"], text: "Augenreizung" },
  atemwege: { h: ["H335", "H330", "H331", "H314"], text: "Reizung der Atemwege / Husten" },
  atemnot: { h: ["H330", "H331"], ids: ["chlor", "phosgen", "ammoniak", "stickstoffdioxid", "schwefeldioxid"], text: "Atemnot / Lungen\xF6dem" },
  haut: { h: ["H314", "H315", "H311", "H310"], text: "Hautr\xF6tung/-ver\xE4tzung" },
  schwindel: { h: ["H336", "H330", "H331"], ids: ["kohlenmonoxid", "schwefelwasserstoff"], text: "Kopfschmerz / Schwindel / Benommenheit" },
  uebelkeit: { h: ["H302", "H301", "H332"], text: "\xDCbelkeit / Erbrechen" },
  bewusstlos: { h: ["H330", "H300", "H310"], ids: ["cyanwasserstoff", "schwefelwasserstoff", "kohlenmonoxid", "stickstoff", "argon"], text: "Pl\xF6tzliche Bewusstlosigkeit" },
  pupillen: { h: [], ids: ["sarin", "soman", "tabun", "vx"], text: "Pupillenverengung / Speichelfluss / Kr\xE4mpfe (cholinerg)" },
  blasen: { h: [], ids: ["schwefellost", "stickstofflost", "lewisit"], text: "Verz\xF6gerte Hautblasen / R\xF6tung" },
  blau: { h: [], ids: ["anilin", "nitrobenzol"], text: "Blaue Lippen/Haut (Meth\xE4moglobin)" }
};
function analyze(o) {
  var _a, _b, _c;
  const subs2 = list("substances");
  const cands = [];
  const unN = (o.un ?? "").replace(/\D/g, "");
  const guess = (o.guess ?? "").trim().toLowerCase();
  const tubeTxt = (o.tubes ?? "").toLowerCase();
  const imsTxt = (o.ims ?? "").toLowerCase();
  const odor = (o.odor ?? "").toLowerCase();
  const color = (o.color ?? "").toLowerCase();
  const symp = (o.symptoms ?? []).filter((k) => SYMP[k]);
  const susp = o.origin === "verdaechtig";
  for (const s of subs2) {
    const t = s.traits;
    if (!t) continue;
    let sc = 0;
    const R2 = [];
    const add = (pts, ok2, text) => {
      sc += pts;
      R2.push({ ok: ok2, text });
    };
    const cwa = t.cwa;
    if (unN && (s.un_number ?? "").replace(/[^\d/]/g, "").split("/").includes(unN)) add(8, true, `UN-Nummer ${unN} passt (${s.un_number})`);
    if (guess && (s.name.toLowerCase().includes(guess) || s.synonyms.some((x) => x.toLowerCase().includes(guess)) || s.cas === guess)) add(6, true, "Entspricht dem Namensvorschlag / der Kennzeichnung");
    const nm = s.name.toLowerCase().split(/[ (]/)[0];
    if (tubeTxt && nm.length > 3 && tubeTxt.includes(nm.slice(0, Math.max(4, nm.length - 2)))) add(5, true, "Pr\xFCfr\xF6hrchen-Anzeige passt");
    if (imsTxt && (imsTxt.includes(nm.slice(0, 5)) || s.substance_group && imsTxt.includes(s.substance_group.toLowerCase().split(" ")[0]))) add(4, true, "IMS-Hinweis passt");
    if (o.state && o.state !== "unbekannt") {
      if (t.states.includes(o.state)) add(1.5, true, `Aggregatzustand ${o.state} m\xF6glich`);
      else add(-7, false, `Aggregatzustand: Stoff liegt \xFCblicherweise als ${t.states.join("/")} vor`);
    }
    if (o.flammable === "ja") {
      if (t.flammable) add(3, true, "Brennbar/entz\xFCndbar \u2013 passt");
      else add(-5, false, "Stoff gilt als nicht brennbar");
    }
    if (o.flammable === "nein") {
      if (t.flammable) add(-4, false, "Stoff ist brennbar, Probe wurde als nicht entflammbar beschrieben");
      else add(1.5, true, "Nicht brennbar \u2013 passt");
    }
    if (o.ph && o.ph !== "unbekannt" && s.state !== "Gas") {
      if (t.ph === o.ph) add(4, true, `pH-Verhalten ${o.ph} passt`);
      else if (t.ph && t.ph !== o.ph) add(-5, false, `pH: Stoff reagiert ${t.ph}, gemessen ${o.ph}`);
    }
    if (o.water && o.water !== "unbekannt") {
      if (o.water === "mischbar") {
        if (t.solubility === "mischbar" || t.solubility === "gut") add(2.5, true, "Mit Wasser mischbar/gut l\xF6slich");
        else if (t.solubility === "gering") add(-3, false, "Stoff ist kaum wasserl\xF6slich");
      }
      if (o.water === "schwimmt") {
        if (t.floats === true && t.solubility !== "mischbar") add(3, true, "Leichter als Wasser, schwimmt");
        else if (t.floats === false) add(-4, false, "Stoff ist schwerer als Wasser");
      }
      if (o.water === "sinkt") {
        if (t.floats === false) add(3, true, "Schwerer als Wasser, sinkt");
        else if (t.floats === true) add(-4, false, "Stoff ist leichter als Wasser");
      }
      if (o.water === "reagiert") {
        if (t.water_reactive) add(6, true, "Reagiert mit Wasser \u2013 passt");
        else add(-1, false, "Keine Wasserreaktivit\xE4t hinterlegt");
      }
    }
    if (odor && odor !== "unbekannt") {
      const kws = ODOR[odor] ?? [odor];
      const so = (s.odor ?? "").toLowerCase();
      if (odor === "geruchlos") {
        if (so && !/geruchlos/.test(so) && !/nahezu geruchlos/.test(so)) add(-1.5, false, "Stoff hat \xFCblicherweise Geruch");
        else if (so) add(1, true, "Geruchlos \u2013 passt");
      } else if (so && kws.some((k) => so.includes(k))) add(3, true, `Geruch \u201E${odor.replace("_", " ")}" passt`);
      else if (so) add(-0.5, null, "Geruch weicht von der Beschreibung ab");
    }
    if (color && color !== "unbekannt" && color !== "farblos") {
      const sc2 = (s.color ?? "").toLowerCase();
      if (sc2 && sc2.includes(color.split("/")[0])) add(1.5, true, `Farbe ${color} passt`);
      else if (sc2) add(-1, null, "Farbe weicht ab");
    }
    if (color === "farblos" && s.color && !/farblos/.test(s.color.toLowerCase())) add(-1.5, null, "Stoff ist meist gef\xE4rbt");
    if (o.pid != null) {
      const resp = s.ie_ev != null && s.ie_ev < 10.6;
      if (o.pid >= 2) {
        if (resp) add(2.5, true, "PID-Anzeige erh\xF6ht \u2013 Stoff ist photoionisierbar (IE < 10,6 eV)");
        else if (s.ie_ev != null) add(-3.5, false, `PID erh\xF6ht, aber IE ${String(s.ie_ev).replace(".", ",")} eV liegt \xFCber der Lampenenergie`);
      } else if (o.pid < 0.5 && (t.flammable || t.toxic) && s.state !== "Feststoff") {
        if (resp) add(-2, false, "PID ohne Anzeige, obwohl photoionisierbarer Dampf zu erwarten w\xE4re");
        else if (s.ie_ev != null) add(0.5, true, "PID ohne Anzeige \u2013 passt (nicht photoionisierbar)");
      }
    }
    if (o.lel != null && o.lel >= 1) {
      if (t.flammable) add(2.5, true, "EX-Anzeige vorhanden \u2013 brennbarer Dampf/Gas");
      else add(-2.5, false, "EX-Anzeige, aber Stoff nicht brennbar");
    }
    if (o.co != null && o.co > 5) {
      if (s.cas === "630-08-0") add(7, true, "CO-Kanal erh\xF6ht");
      else if (t.gas) add(-0.5, null, "CO-Kanal erh\xF6ht (anderer Stoff?)");
    }
    if (o.h2s != null && o.h2s > 0.5) {
      if (s.cas === "7783-06-4") add(7, true, "H\u2082S-Kanal erh\xF6ht");
    }
    if (o.o2 != null && o.o2 < 19.5) {
      if (t.asphyxiant) add(5, true, "Sauerstoffmangel \u2013 verdr\xE4ngendes Gas m\xF6glich");
      else if (t.gas) add(0.5, null, "Sauerstoffmangel m\xF6glich");
    }
    if (o.dose != null && o.dose >= 0.3) add(-2, null, "Dosisleistung erh\xF6ht (radiologische Komponente separat pr\xFCfen)");
    if (o.origin && o.origin !== "unbekannt") {
      if (t.origins.includes(o.origin)) add(2.5, true, `Typische Herkunft: ${ORIGIN_LABEL[o.origin] ?? o.origin}`);
      else if (t.origins.length) add(-0.5, null, `Herkunft \u201E${ORIGIN_LABEL[o.origin] ?? o.origin}" untypisch`);
    }
    for (const k of symp) {
      const sy = SYMP[k];
      const idHit = (_a = sy.ids) == null ? void 0 : _a.includes(s.id);
      const hHit = sy.h.some((h) => s.h.includes(h));
      if (idHit) add(4, true, `Symptom \u201E${sy.text}" typisch`);
      else if (hHit) add(1.5, true, `Symptom \u201E${sy.text}" m\xF6glich (Gefahreneinstufung)`);
    }
    if (cwa) {
      const indic = susp || symp.some((k) => ["pupillen", "blasen"].includes(k)) || /kampfstoff|sarin|vx|lost|tabun|soman|lewisit/.test(imsTxt + guess);
      if (!indic) add(-9, null, "Kein Hinweis auf Kampfstoff (Herkunft/Symptome/IMS)");
    }
    cands.push({ id: s.id, name: s.name, cas: s.cas, category: s.cbrn_category, subcategory: s.subcategory, score: Math.round(sc * 10) / 10, level: "hinweis", confidence: 0, reasons: R2, next: [] });
  }
  cands.sort((a, b) => b.score - a.score);
  const top = cands.slice(0, 8);
  const best = ((_b = top[0]) == null ? void 0 : _b.score) ?? 0;
  const second = ((_c = top[1]) == null ? void 0 : _c.score) ?? -99;
  const nInfo = (o.state && o.state !== "unbekannt" ? 1 : 0) + (o.flammable && o.flammable !== "unbekannt" ? 1 : 0) + (o.ph && o.ph !== "unbekannt" ? 1 : 0) + (o.water && o.water !== "unbekannt" ? 1 : 0) + (o.odor && o.odor !== "unbekannt" ? 1 : 0) + (o.pid != null ? 1 : 0) + (unN || guess || tubeTxt || imsTxt ? 2 : 0);
  top.forEach((c, i) => {
    var _a2, _b2;
    const rel = best > 0 ? Math.max(0, c.score) / best : 0;
    c.confidence = Math.max(0, Math.min(95, Math.round(Math.max(0, c.score) * 4.2 * (nInfo >= 3 ? 1 : 0.6))));
    c.level = i === 0 && c.score >= 12 && best - second >= 3 && nInfo >= 3 ? "moegliche_identifikation" : c.score >= 7 && nInfo >= 2 ? "verdacht" : "hinweis";
    if (rel < 0.45 && i > 0) c.level = "hinweis";
    const tubes2 = list("test_tubes", "WHERE cas = ?", [c.cas]);
    const sub = subs2.find((x) => x.id === c.id);
    c.next = [
      ...tubes2.length ? [`Pr\xFCfr\xF6hrchen ${tubes2[0].product} (${tubes2[0].manufacturer}) zur Best\xE4tigung einsetzen`] : [],
      ...((_a2 = sub == null ? void 0 : sub.devices) == null ? void 0 : _a2.includes("IMS")) ? ["IMS-Messung wiederholen / Bibliothek abgleichen"] : [],
      ...((_b2 = sub == null ? void 0 : sub.devices) == null ? void 0 : _b2.includes("PID")) ? ["PID-Verlauf beobachten (nur Screening)"] : [],
      "Probe sichern und mit Chain of Custody an das Labor \xFCbergeben"
    ];
  });
  const extras = [];
  if (o.dose != null && o.dose >= 0.3) {
    const nucs = list("radionuclides").filter((n) => {
      var _a2;
      return (_a2 = n.gamma_kev) == null ? void 0 : _a2.length;
    });
    const hit = (o.gamma_kev ?? []).length ? nucs.map((n) => ({ n, d: Math.min(...(o.gamma_kev ?? []).flatMap((e) => n.gamma_kev.map((g) => Math.abs(g - e)))) })).filter((x) => x.d <= 10).sort((a, b) => a.d - b.d) : [];
    extras.push({ type: "radiologisch", title: `Dosisleistung erh\xF6ht (${o.dose} \xB5Sv/h)`, text: hit.length ? "Gamma-Linien passen zu folgenden Nukliden (Zuordnung vorl\xE4ufig):" : "Nuklidzuordnung \xFCber Gammaspektrum (Energie der Linien eingeben) \u2013 ohne Spektrum nicht m\xF6glich.", refs: hit.map((x) => ({ id: x.n.id, name: x.n.name, hint: `Linie \xB1${x.d.toFixed(1)} keV` })) });
  }
  if (o.kind === "BIOLOGISCH" || susp && o.state === "Feststoff" && o.kind === "BIOLOGISCH") {
    extras.push({ type: "biologisch", title: "Biologische Probe", text: "Vor-Ort-Analyse nicht m\xF6glich \u2013 nur Probenahme/Transport durch geschulte Kr\xE4fte und Laboruntersuchung. Handlungsempfehlungen in der Biologischen Datenbank.", refs: list("biological_agents").slice(0, 9).map((b) => ({ id: b.id, name: b.name })) });
  }
  const topC = top[0];
  const summary = !topC ? "Keine Zuordnung m\xF6glich." : topC.score < 3 ? "Keine belastbare Zuordnung \u2013 weitere Angaben/Messungen erforderlich." : `${topC.level === "moegliche_identifikation" ? "M\xF6gliche Identifikation" : topC.level === "verdacht" ? "Verdacht" : "Hinweis"}: ${topC.name}`;
  return { candidates: top, extras, summary, inputs_used: nInfo, hint: nInfo < 3 ? "Wenige Angaben \u2013 je mehr Beobachtungen und Messwerte, desto verl\xE4sslicher der Vorschlag." : null, simulated: true };
}

// server/auth.ts
var import_node_crypto = require("node:crypto");
function createSession(vehicle_id, name, funktion) {
  const token = (0, import_node_crypto.randomBytes)(24).toString("hex");
  const t = now();
  db.prepare("INSERT INTO sessions(token,vehicle_id,name,funktion,created_at,last_seen) VALUES(?,?,?,?,?,?)").run(token, vehicle_id, name, funktion, t, t);
  return token;
}
var getSession = (token) => token ? db.prepare("SELECT * FROM sessions WHERE token = ?").get(token) : void 0;
var touch = (token) => db.prepare("UPDATE sessions SET last_seen = ? WHERE token = ?").run(now(), token);
var endSession = (token) => db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
var purgeSessions = () => db.prepare("DELETE FROM sessions WHERE last_seen < ?").run(new Date(Date.now() - 14 * 864e5).toISOString());
function crewOf(vehicle_id) {
  const since = new Date(Date.now() - 12e4).toISOString();
  const rows = vehicle_id ? db.prepare("SELECT * FROM sessions WHERE vehicle_id = ? AND last_seen >= ? ORDER BY created_at").all(vehicle_id, since) : db.prepare("SELECT * FROM sessions WHERE last_seen >= ? ORDER BY vehicle_id, created_at").all(since);
  return rows.map((s) => ({ id: s.token.slice(0, 8), vehicle_id: s.vehicle_id, role: s.funktion, name: s.name, since: s.created_at }));
}
function authUser(req) {
  var _a;
  const q = (_a = req.query) == null ? void 0 : _a.token;
  const s = getSession(String(req.headers["x-session"] ?? q ?? ""));
  return s ? { id: `${s.name} (${s.funktion})`, token: s.token, name: s.name, callsign: s.funktion, vehicle_id: s.vehicle_id, role: "admin" } : null;
}

// server/report.ts
function buildReport(missionId, author) {
  var _a;
  const m = get("missions", missionId);
  const v = get("vehicles", m.vehicle_id);
  const from = m.started_at ?? m.created_at;
  const to = m.ended_at ?? (/* @__PURE__ */ new Date()).toISOString();
  const meas = list("measurements", "WHERE mission_id = ? ORDER BY seq", [missionId]);
  const samples = list("samples", "WHERE mission_id = ? ORDER BY ts", [missionId]).map(({ truth_ref, ...s }) => s);
  const wx = db.prepare("SELECT * FROM weather_records WHERE ts BETWEEN ? AND ? ORDER BY ts").all(from, to).map((w) => ({ ...w, wind_from_text: compass(w.wind_from) }));
  const alarms = list("alarms", "WHERE vehicle_id = ? AND ts BETWEEN ? AND ? ORDER BY ts", [m.vehicle_id, from, to]);
  const subIds = /* @__PURE__ */ new Set();
  meas.forEach((x) => x.substance_id && subIds.add(x.substance_id));
  samples.forEach((s) => {
    var _a2;
    return ((_a2 = s.lab_result) == null ? void 0 : _a2.substance_id) && subIds.add(s.lab_result.substance_id);
  });
  const refs = [...subIds].map((id) => {
    var _a2;
    const s = get("substances", id);
    return { id, name: s == null ? void 0 : s.name, cas: s == null ? void 0 : s.cas, category: s == null ? void 0 : s.cbrn_category, quality: s == null ? void 0 : s.quality, source: (_a2 = get("sources", s == null ? void 0 : s.source_id)) == null ? void 0 : _a2.name };
  });
  const devices3 = [...new Set(meas.map((x) => x.device))];
  const anomalies = meas.filter((x) => x.status !== "NORMAL");
  return {
    kind: "EINSATZBERICHT",
    simulated: true,
    notice: "SIMULATION \u2013 Messwerte, GPS, Einsatz und Identifikationen sind nicht real. Fachdaten ungepr\xFCft (siehe Quellenstatus).",
    number: `E-${missionId}`,
    author,
    mission: { ...m, sector_name: ((_a = SECTORS[m.sector]) == null ? void 0 : _a.name) ?? m.sector },
    vehicle: v,
    crew: crewOf(m.vehicle_id),
    start: from,
    end: m.ended_at ?? null,
    devices: devices3,
    measurement_count: meas.length,
    measurements: meas,
    anomalies: anomalies.length,
    samples,
    weather: wx,
    alarms,
    substance_refs: refs,
    track: meas.map((x) => [x.lon, x.lat]),
    remarks: m.notes ?? ""
  };
}
var esc = (v) => {
  const s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
function reportCsv(d) {
  const h = ["id", "ts", "lat", "lon", "vehicle_id", "device", "value", "unit", "status", "level", "headline", "substance_id", "data_source"];
  return [h.join(";"), ...d.measurements.map((m) => h.map((k) => esc(m[k])).join(";"))].join("\n");
}

// server/import.ts
function casValid(cas) {
  const m = /^(\d{2,7})-(\d{2})-(\d)$/.exec(cas ?? "");
  if (!m) return false;
  const digits = (m[1] + m[2]).split("").reverse();
  const sum = digits.reduce((a, d, i) => a + (i + 1) * +d, 0);
  return sum % 10 === +m[3];
}
function parseCsv(text) {
  const sep = text.split("\n")[0].includes(";") ? ";" : ",";
  const rows = [];
  let cur = [], f = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') {
        f += '"';
        i++;
      } else if (c === '"') q = false;
      else f += c;
    } else if (c === '"') q = true;
    else if (c === sep) {
      cur.push(f);
      f = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      cur.push(f);
      rows.push(cur);
      cur = [];
      f = "";
    } else f += c;
  }
  if (f || cur.length) {
    cur.push(f);
    rows.push(cur);
  }
  const [h, ...rest] = rows.filter((r) => r.some((x) => x.trim()));
  if (!h) return [];
  return rest.map((r) => Object.fromEntries(h.map((k, i) => {
    var _a, _b;
    return [k.trim(), ((_a = r[i]) == null ? void 0 : _a.trim()) === "" ? null : (_b = r[i]) == null ? void 0 : _b.trim()];
  })));
}
var JSONISH = ["synonyms", "ghs", "h", "p", "methods", "devices", "radiation", "gamma_kev"];
function validateImport(table, format, content) {
  let rows = [];
  try {
    rows = format === "csv" ? parseCsv(content) : JSON.parse(content);
  } catch {
    return { total: 0, valid: [], review: [], invalid: [{ reason: "Datei nicht lesbar (kein g\xFCltiges " + format.toUpperCase() + ")" }] };
  }
  if (!Array.isArray(rows)) rows = [rows];
  const valid = [], review = [], invalid = [];
  const cols = columns(table);
  rows.forEach((r, i) => {
    const o = {};
    for (const k of Object.keys(r)) if (cols.includes(k)) o[k] = r[k];
    for (const k of JSONISH) if (typeof o[k] === "string" && cols.includes(k)) o[k] = o[k].includes("|") ? o[k].split("|").map((x) => x.trim()) : o[k] ? [o[k]] : [];
    if (!o.name && !o.product) {
      invalid.push({ row: i + 1, reason: "name fehlt" });
      return;
    }
    o.id ??= String(o.name ?? o.product).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const reasons = [];
    if (table === "substances") {
      if (!o.cas || !casValid(o.cas)) reasons.push("CAS fehlt oder Pr\xFCfziffer ung\xFCltig");
      if (!["C", "B", "R", "N", "UNKNOWN"].includes(o.cbrn_category)) {
        reasons.push("CBRN-Kategorie ung\xFCltig");
        o.cbrn_category = "UNKNOWN";
      }
    }
    if (table !== "test_tubes" && (!o.source_id || !get("sources", o.source_id))) reasons.push("Quelle fehlt/unbekannt (QUELLE ERFORDERLICH)");
    if (reasons.length) review.push({ ...o, _reasons: reasons });
    else valid.push(o);
  });
  return { total: rows.length, valid, review, invalid };
}

// server/incident.ts
var CATEGORIES = { C: "Chemisch", R: "Radiologisch", B: "Biologisch", U: "Unbekannt" };
var ROLES = ["Messtechniker (Maschinist)", "Gruppenf\xFChrer CBRN-ErkW", "Messtrupp"];
var AMOUNTS = ["gering", "mittel", "gro\xDF"];
var SIZE = {
  // [Radius m, Spitzenwert]
  C: { gering: [150, 15], mittel: [300, 40], "gro\xDF": [600, 100] },
  R: { gering: [120, 10], mittel: [200, 40], "gro\xDF": [350, 120] },
  B: { gering: [60, 0], mittel: [100, 0], "gro\xDF": [150, 0] }
};
var pick = (a) => a[Math.floor(Math.random() * a.length)];
function pickTruth(cat) {
  const chem = () => ({ ref_type: "substance", ref_id: pick(list("substances", "WHERE cbrn_category = 'C' AND ims_sim = 1")).id, category: "C" });
  const rad2 = () => ({ ref_type: "radionuclide", ref_id: pick(list("radionuclides").filter((n) => {
    var _a;
    return ((_a = n.gamma_kev) == null ? void 0 : _a.length) && n.id !== "k-40";
  })).id, category: "R" });
  const bio = () => ({ ref_type: "biological", ref_id: pick(list("biological_agents")).id, category: "B" });
  if (cat === "C") return chem();
  if (cat === "R") return rad2();
  if (cat === "B") return bio();
  return Math.random() < 0.65 ? { ...chem(), category: "U" } : { ...rad2(), category: "U" };
}
function publicIncident(inc) {
  if (!inc) return null;
  const reveal = inc.status !== "AKTIV" || inc.known;
  const { ref_type, ref_id, peak, ...rest } = inc;
  const ref = reveal ? ref_type === "substance" ? get("substances", ref_id) : ref_type === "radionuclide" ? get("radionuclides", ref_id) : get("biological_agents", ref_id) : null;
  return { ...rest, category_text: CATEGORIES[inc.category] ?? inc.category, ref_type: reveal ? ref_type : null, ref_id: reveal ? ref_id : null, ref_name: (ref == null ? void 0 : ref.name) ?? null, ref_hidden: !reveal };
}
function createIncident(by, b) {
  const name = String(b.name ?? "").trim();
  if (!name) return { error: "Einsatzstichwort fehlt" };
  const cat = String(b.category ?? "");
  if (!CATEGORIES[cat]) return { error: "Gefahrenart ung\xFCltig" };
  const lat = Number(b.lat), lon = Number(b.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return { error: "Einsatzstelle fehlt \u2013 bitte auf der Karte markieren" };
  const amount = AMOUNTS.includes(b.amount) ? b.amount : "mittel";
  let truth;
  if (b.ref_type && b.ref_id) {
    const row = get(b.ref_type === "substance" ? "substances" : b.ref_type === "radionuclide" ? "radionuclides" : "biological_agents", b.ref_id);
    if (!row) return { error: "Gew\xE4hlter Stoff nicht gefunden" };
    truth = { ref_type: b.ref_type, ref_id: b.ref_id, category: row.cbrn_category === "U" ? "U" : b.ref_type === "substance" ? "C" : b.ref_type === "radionuclide" ? "R" : "B" };
    if (cat === "U") truth.category = "U";
  } else truth = pickTruth(cat);
  const [radius_m, peak] = SIZE[truth.category === "U" ? truth.ref_type === "radionuclide" ? "R" : "C" : truth.category][amount];
  if (activeIncident()) return { error: "Es l\xE4uft bereits ein Einsatz \u2013 er wurde von einer anderen Person angelegt" };
  const n = (db.prepare("SELECT COUNT(*) c FROM incidents").get().c ?? 0) + 1;
  const inc = {
    id: "E-" + String(n).padStart(4, "0"),
    name,
    status: "AKTIV",
    created_at: now(),
    created_by: by,
    location_text: String(b.location_text ?? "").trim() || null,
    report: String(b.report ?? "").trim() || null,
    category: truth.category,
    ref_type: truth.ref_type,
    ref_id: truth.ref_id,
    known: b.known ? 1 : 0,
    amount,
    radius_m,
    peak,
    lat,
    lon
  };
  insert("incidents", inc);
  for (const c of crewOf()) noteCrew(c.name, c.role, c.vehicle_id);
  audit(by, "create", "incident", inc.id, { name, category: truth.category, amount, known: !!b.known });
  emit("incident.changed", publicIncident(inc));
  emit("system.status", systemStatus());
  return { incident: publicIncident(inc) };
}
function noteCrew(name, funktion, vehicle_id) {
  const inc = activeIncident();
  if (!inc) return;
  db.prepare("INSERT OR IGNORE INTO incident_crew(incident_id,name,funktion,vehicle_id,since) VALUES(?,?,?,?,?)").run(inc.id, name, funktion, vehicle_id, now());
}
var REQUIRED = [["where", "Wo (Einsatzort)"], ["what", "Was (Lage / Einsatzgeschehen)"], ["measures", "Durchgef\xFChrte Ma\xDFnahmen"], ["result", "Ergebnis / Feststellungen"]];
var num2 = (v) => v === "" || v == null || !Number.isFinite(Number(v)) ? null : Math.max(0, Math.round(Number(v)));
function endIncident(by, id, form = {}) {
  const inc = get("incidents", id);
  if (!inc || inc.status !== "AKTIV") return { error: "Kein aktiver Einsatz mit dieser Kennung" };
  const f = form ?? {};
  const missing = REQUIRED.filter(([k]) => !String(f[k] ?? "").trim()).map(([, l]) => l);
  if (missing.length) return { error: `Einsatzbericht unvollst\xE4ndig: ${missing.join(", ")}` };
  for (const vid of Object.keys(state.runs)) stopRun(by, vid);
  resetDevices();
  const ended = now();
  const t = (v) => String(v ?? "").trim() || null;
  const crew = list("incident_crew", "WHERE incident_id = ? ORDER BY since", [id]).map((c) => {
    var _a;
    return { name: c.name, funktion: c.funktion, vehicle_id: c.vehicle_id, vehicle: ((_a = get("vehicles", c.vehicle_id)) == null ? void 0 : _a.name) ?? c.vehicle_id };
  });
  const people = new Set(crew.map((c) => c.name.toLowerCase())).size;
  const runs = list("runs", "WHERE incident_id = ?", [id]);
  const q = (sql, ...a) => db.prepare(sql).get(...a);
  const meas = q("SELECT COUNT(*) c, SUM(CASE WHEN status != ? THEN 1 ELSE 0 END) a FROM measurements WHERE incident_id = ?", "NORMAL", id);
  const samples = list("samples", "WHERE ts >= ? ORDER BY ts", [inc.created_at]).map(({ truth_ref, ...s }) => s);
  const alarms = list("alarms", "WHERE ts >= ? ORDER BY ts", [inc.created_at]);
  const w = db.prepare("SELECT * FROM weather_records ORDER BY ts DESC LIMIT 1").get();
  const ims = list("measurements", "WHERE incident_id = ? AND device = 'IMS' AND substance_id IS NOT NULL", [id]).map((m) => m.substance_id);
  const imsNames = [...new Set(ims)].map((sid) => {
    var _a;
    return (_a = get("substances", sid)) == null ? void 0 : _a.name;
  }).filter(Boolean);
  const truthRow = inc.ref_type === "substance" ? get("substances", inc.ref_id) : inc.ref_type === "radionuclide" ? get("radionuclides", inc.ref_id) : get("biological_agents", inc.ref_id);
  const startMs = Date.parse(inc.created_at), endMs = Date.parse(ended);
  const data = {
    kind: "EINSATZBERICHT_E",
    title: inc.name,
    simulated: true,
    number: `EB-${inc.id}`,
    author: by,
    notice: "SIMULATION \u2013 Messwerte, Identifikationen und Laborergebnisse sind nicht real. Fachdaten ungepr\xFCft.",
    incident: { id: inc.id, name: inc.name, category: inc.category, category_text: CATEGORIES[inc.category], amount: inc.amount, lat: inc.lat, lon: inc.lon, report: inc.report, created_by: inc.created_by },
    where: t(f.where),
    what: t(f.what),
    measures: t(f.measures),
    result: t(f.result),
    handover: t(f.handover),
    remarks: t(f.remarks),
    other_forces: t(f.other_forces),
    injured: num2(f.injured),
    evacuated: num2(f.evacuated),
    start: inc.created_at,
    end: ended,
    duration_min: Math.max(0, Math.round((endMs - startMs) / 6e4)),
    forces_count: num2(f.forces_count) ?? people,
    crew_count: people,
    crew,
    vehicles: [...new Set(crew.map((c) => c.vehicle))],
    stats: {
      runs: runs.length,
      run_distance_m: Math.round(runs.reduce((a, r) => a + (r.distance_m ?? 0), 0)),
      measurements: (meas == null ? void 0 : meas.c) ?? 0,
      anomalies: (meas == null ? void 0 : meas.a) ?? 0,
      samples: samples.length,
      alarms: alarms.length,
      max_dose: runs.reduce((a, r) => Math.max(a, r.max_dose ?? 0), 0),
      max_pid: runs.reduce((a, r) => Math.max(a, r.max_pid ?? 0), 0)
    },
    samples: samples.map((s) => {
      var _a;
      return { id: s.id, kind: s.kind, ts: s.ts, lab_status: s.lab_status, lab_text: ((_a = s.lab_result) == null ? void 0 : _a.text) ?? null };
    }),
    alarms: alarms.map((a) => ({ id: a.id, ts: a.ts, category: a.category, description: a.description })),
    device_findings: imsNames,
    weather: w ? { temperature: w.temperature, humidity: w.humidity, pressure: w.pressure, wind_speed: w.wind_speed, wind_from: w.wind_from, wind_from_text: compass(w.wind_from) } : null,
    truth: { known: !!inc.known, type: inc.ref_type, name: (truthRow == null ? void 0 : truthRow.name) ?? null, cas: (truthRow == null ? void 0 : truthRow.cas) ?? null }
  };
  update("incidents", id, { status: "BEENDET", ended_at: ended });
  insert("reports", { id: data.number, mission_id: null, incident_id: id, created_at: ended, created_by: by, data }, true);
  audit(by, "end", "incident", id, { report: data.number });
  emit("incident.changed", null);
  emit("system.status", systemStatus());
  return { incident: publicIncident(get("incidents", id)), report: { id: data.number, ...data } };
}

// server/routes.ts
var ADMIN_TABLES = ["substances", "radionuclides", "biological_agents", "measurement_devices", "measurement_methods", "sources", "test_tubes", "vehicles"];
var FUNKTIONEN = ROLES;
var PUBLIC = [/^\/api\/meta$/, /^\/api\/auth\/(vehicles|login)$/];
function shiftedBounds() {
  const b = config.gta5.bounds;
  const o = getSetting("gta_offset", { dx: 0, dy: 0 });
  return { minX: b.minX + o.dx, maxX: b.maxX + o.dx, minY: b.minY + o.dy, maxY: b.maxY + o.dy };
}
function registerRoutes(app) {
  app.addHook("onRequest", async (req) => {
    const url = req.url.split("?")[0];
    if (!url.startsWith("/api/") || PUBLIC.some((r) => r.test(url))) return;
    if (!authUser(req)) throw Object.assign(new Error("Nicht angemeldet"), { statusCode: 401 });
  });
  const user = (req) => authUser(req);
  const need = (req, _lvl = 1) => user(req);
  const nf = (what) => Object.assign(new Error(`${what} nicht gefunden`), { statusCode: 404 });
  const q = (req) => req.query;
  app.get("/api/meta", async () => ({
    app: "CBRN Erkunder Software",
    version: "0.1.0",
    sectors: Object.entries(SECTORS).map(([k, v]) => ({ key: k, name: v.name, polygon: sectorPolygon(k) })),
    center: CENTER,
    route: routeLL(),
    map: MODE === "gta5" ? { mode: "gta5", image: config.gta5.image, bounds: shiftedBounds(), offset: getSetting("gta_offset", { dx: 0, dy: 0 }) } : { mode: "geo", tileUrl: config.geo.tileUrl, attribution: config.geo.attribution },
    mgmg_channels: mgmgChannels(),
    disclaimer: "Fachdaten: \xF6ffentliche Quellen, ungepr\xFCft (QUELLE ERFORDERLICH). Messwerte, GPS, Eins\xE4tze, Identifikationen und Laborergebnisse: SIMULIERT."
  }));
  app.get("/api/auth/vehicles", async () => ({
    vehicles: list("vehicles").map((v) => ({ id: v.id, name: v.name, connected: fivemConnected(v.id), crew: crewOf(v.id).map((c) => ({ name: c.name, funktion: c.role })) })),
    funktionen: FUNKTIONEN
  }));
  app.post("/api/auth/login", async (req, rep) => {
    const b = req.body ?? {};
    const name = String(b.name ?? "").trim().slice(0, 60);
    const funktion = String(b.funktion ?? "").trim().slice(0, 60);
    const v = get("vehicles", String(b.vehicle_id ?? ""));
    if (!v) throw Object.assign(new Error("Bitte ein Fahrzeug ausw\xE4hlen"), { statusCode: 400 });
    if (name.length < 2) throw Object.assign(new Error("Bitte den Namen eingeben"), { statusCode: 400 });
    if (!FUNKTIONEN.includes(funktion)) throw Object.assign(new Error("Bitte eine Funktion aus der Liste w\xE4hlen"), { statusCode: 400 });
    purgeSessions();
    const token = createSession(v.id, name, funktion);
    audit(`${name} (${funktion})`, "login", "vehicle", v.id);
    noteCrew(name, funktion, v.id);
    emit("crew.changed", { vehicle_id: v.id });
    rep.code(201);
    return { token, session: { vehicle_id: v.id, vehicle_name: v.name, name, funktion } };
  });
  app.get("/api/auth/me", async (req) => {
    var _a;
    const u = user(req);
    touch(u.token);
    noteCrew(u.name, u.callsign, u.vehicle_id);
    return { vehicle_id: u.vehicle_id, vehicle_name: (_a = get("vehicles", u.vehicle_id)) == null ? void 0 : _a.name, name: u.name, funktion: u.callsign };
  });
  app.post("/api/auth/logout", async (req) => {
    const u = user(req);
    endSession(u.token);
    audit(u.id, "logout", "vehicle", u.vehicle_id);
    emit("crew.changed", { vehicle_id: u.vehicle_id });
    return { ok: true };
  });
  app.get("/api/system/status", async () => ({ ...systemStatus(), drive: state.drive, fivem_origin: getSetting("fivem_origin"), gta_offset: getSetting("gta_offset", { dx: 0, dy: 0 }), mgmg_channels: mgmgChannels(), now: now(), uptime_s: Math.round(process.uptime()) }));
  app.post("/api/system/calibrate", async (req) => {
    const u = need(req);
    const b = req.body ?? {};
    const o = getSetting("gta_offset", { dx: 0, dy: 0 });
    let n = o;
    if (b.reset) n = { dx: 0, dy: 0 };
    else {
      const dx = Number(b.dx), dy = Number(b.dy);
      if (!Number.isFinite(dx) || !Number.isFinite(dy) || Math.abs(dx) > 5e3 || Math.abs(dy) > 5e3) throw Object.assign(new Error("Ung\xFCltiger Versatz"), { statusCode: 400 });
      n = { dx: o.dx - dx, dy: o.dy - dy };
    }
    setSetting("gta_offset", n);
    audit(u.id, "calibrate", "map", "gta_offset", { from: o, to: n });
    const map = { offset: n, bounds: shiftedBounds() };
    emit("map.changed", map);
    return map;
  });
  app.post("/api/system/config", async (req) => {
    const u = need(req, 4);
    const b = req.body;
    if (b.mgmg_channels) setSetting("mgmg_channels", b.mgmg_channels);
    if (b.fivem_origin) setSetting("fivem_origin", b.fivem_origin);
    if (b.gta_offset) setSetting("gta_offset", { dx: Number(b.gta_offset.dx) || 0, dy: Number(b.gta_offset.dy) || 0 });
    audit(u.id, "config", "system", "config", b);
    return { ok: true };
  });
  app.get("/api/substances", async (req) => {
    const p = q(req);
    const where = [];
    const a = [];
    if (p.q) {
      const l = `%${p.q.toLowerCase()}%`;
      where.push("(lower(name) LIKE ? OR lower(synonyms) LIKE ? OR cas LIKE ? OR lower(un_number) LIKE ? OR lower(formula) LIKE ? OR lower(substance_group) LIKE ?)");
      a.push(l, l, l, l, l, l);
    }
    if (p.cat) {
      where.push("cbrn_category = ?");
      a.push(p.cat);
    }
    if (p.sub) {
      where.push("subcategory = ?");
      a.push(p.sub);
    }
    if (p.state) {
      where.push("state = ?");
      a.push(p.state);
    }
    if (p.group) {
      where.push("substance_group LIKE ?");
      a.push(`%${p.group}%`);
    }
    if (p.hazard) {
      where.push("ghs LIKE ?");
      a.push(`%${p.hazard}%`);
    }
    if (p.method) {
      where.push("methods LIKE ?");
      a.push(`%${p.method}%`);
    }
    if (p.device) {
      where.push("devices LIKE ?");
      a.push(`%${p.device}%`);
    }
    if (p.cas) {
      where.push("cas LIKE ?");
      a.push(`%${p.cas}%`);
    }
    if (p.un) {
      where.push("un_number LIKE ?");
      a.push(`%${p.un}%`);
    }
    return list("substances", where.length ? "WHERE " + where.join(" AND ") : "", a, "ORDER BY subcategory, name");
  });
  app.get("/api/substances/:id", async (req) => {
    const s = get("substances", req.params.id);
    if (!s) throw nf("Stoff");
    return { ...s, source: get("sources", s.source_id) };
  });
  app.get("/api/radionuclides", async () => list("radionuclides", "", [], "ORDER BY z, a"));
  app.get("/api/radionuclides/:id", async (req) => {
    const s = get("radionuclides", req.params.id);
    if (!s) throw nf("Radionuklid");
    return { ...s, source: get("sources", s.source_id) };
  });
  app.get("/api/biological-agents", async () => list("biological_agents", "", [], "ORDER BY kind, name"));
  app.get("/api/biological-agents/:id", async (req) => {
    const s = get("biological_agents", req.params.id);
    if (!s) throw nf("Agens");
    return { ...s, source: get("sources", s.source_id) };
  });
  app.get("/api/devices", async () => list("measurement_devices"));
  app.get("/api/methods", async () => list("measurement_methods"));
  app.get("/api/test-tubes", async () => list("test_tubes"));
  app.get("/api/sources", async () => list("sources", "", [], "ORDER BY publisher_priority").map((s) => ({
    ...s,
    records: ["substances", "radionuclides", "biological_agents"].reduce((n, t) => n + db.prepare(`SELECT COUNT(*) c FROM ${t} WHERE source_id = ?`).get(s.id).c, 0)
  })));
  app.get("/api/search", async (req) => {
    const t = (q(req).q ?? "").trim().toLowerCase();
    if (t.length < 1) return [];
    const l = `%${t}%`;
    const out = [];
    for (const s of list("substances", "WHERE lower(name) LIKE ? OR lower(synonyms) LIKE ? OR cas LIKE ? OR lower(un_number) LIKE ? OR lower(formula) LIKE ? OR lower(substance_group) LIKE ? LIMIT 12", [l, l, l, l, l, l]))
      out.push({ type: "substance", id: s.id, title: s.name, cas: s.cas, un: s.un_number, category: s.cbrn_category, sub: s.subcategory, state: s.state, formula: s.formula });
    for (const r of list("radionuclides", "WHERE lower(name) LIKE ? OR lower(element) LIKE ? LIMIT 6", [l, l])) out.push({ type: "radionuclide", id: r.id, title: r.name, category: r.cbrn_category, sub: r.element });
    for (const b of list("biological_agents", "WHERE lower(name) LIKE ? OR lower(disease) LIKE ? LIMIT 6", [l, l])) out.push({ type: "biological", id: b.id, title: b.name, category: "B", sub: b.kind });
    return out;
  });
  app.get("/api/vehicles", async () => list("vehicles"));
  app.get("/api/vehicles/:id", async (req) => {
    const v = get("vehicles", req.params.id);
    if (!v) throw nf("Fahrzeug");
    return { ...v, crew: crewOf(v.id) };
  });
  app.get("/api/crew", async (req) => crewOf(q(req).vehicle));
  app.get("/api/live", async () => ({ vehicles: state.live, weather: weatherNow(), status: systemStatus() }));
  app.get("/api/live/spectrum", async (req) => {
    const v = get("vehicles", q(req).vehicle ?? user(req).vehicle_id);
    if (!v) throw nf("Fahrzeug");
    const { x, y } = llToOffset(v.lat, v.lon);
    return { ...spectrumAt(x, y), label: "SIMULIERTE AUSWERTUNG", data_source: "SIMULATED" };
  });
  app.get("/api/incident", async () => publicIncident(activeIncident()));
  app.get("/api/incidents", async () => list("incidents", "", [], "ORDER BY created_at DESC").map(publicIncident));
  app.post("/api/incidents", async (req, rep) => {
    const u = need(req);
    const r = createIncident(u.id, req.body ?? {});
    if (r.error) throw Object.assign(new Error(r.error), { statusCode: 400 });
    rep.code(201);
    return r;
  });
  app.post("/api/incidents/:id/end", async (req) => {
    const u = need(req);
    const r = endIncident(u.id, req.params.id, req.body);
    if (r.error) throw Object.assign(new Error(r.error), { statusCode: 409 });
    return r;
  });
  app.get("/api/track", async (req) => {
    var _a;
    const p = q(req);
    const vid = p.vehicle ?? user(req).vehicle_id;
    const run = p.run ?? ((_a = state.runs[vid]) == null ? void 0 : _a.id);
    const rows = run ? db.prepare("SELECT lat,lon,ts FROM measurements WHERE run_id = ? ORDER BY seq DESC LIMIT 1500").all(run) : db.prepare("SELECT lat,lon,ts FROM measurements WHERE vehicle_id = ? ORDER BY seq DESC LIMIT 400").all(vid);
    return rows.reverse();
  });
  app.post("/api/devices/:key/power", async (req) => {
    var _a;
    const u = need(req);
    const r = setDevicePower(u.id, u.vehicle_id, req.params.key, !!((_a = req.body) == null ? void 0 : _a.on));
    if (r.error) throw Object.assign(new Error(r.error), { statusCode: 400 });
    return r;
  });
  app.get("/api/runs", async () => list("runs", "", [], "ORDER BY started_at DESC LIMIT 100").map((r) => {
    var _a;
    return ((_a = state.runs[r.vehicle_id]) == null ? void 0 : _a.id) === r.id ? { ...r, distance_m: Math.round(state.runs[r.vehicle_id].dist), active: true } : r;
  }));
  app.get("/api/runs/active", async (req) => ({ run: runInfo(user(req).vehicle_id) }));
  app.post("/api/runs/start", async (req, rep) => {
    const u = need(req, 1);
    const b = req.body ?? {};
    const r = startRun(u.id, u.vehicle_id, b.name, b.lat != null ? { lat: Number(b.lat), lon: Number(b.lon) } : void 0);
    if (r.error) throw Object.assign(new Error(r.error), { statusCode: 409 });
    rep.code(201);
    return r;
  });
  app.post("/api/runs/stop", async (req) => {
    const u = need(req, 1);
    const r = stopRun(u.id, u.vehicle_id);
    if (r.error) throw Object.assign(new Error(r.error), { statusCode: 409 });
    return r;
  });
  app.get("/api/analysis/options", async () => ({ origins: Object.entries(ORIGIN_LABEL).map(([k, v]) => ({ key: k, label: v })) }));
  app.post("/api/analysis", async (req) => {
    need(req, 1);
    return analyze(req.body ?? {});
  });
  app.post("/api/samples/:id/analysis", async (req) => {
    const u = need(req, 1);
    const id = req.params.id;
    const s = get("samples", id);
    if (!s) throw nf("Probe");
    const obs = req.body ?? {};
    const res = analyze({ ...obs, kind: s.kind });
    const top = res.candidates[0];
    const label = !top || top.score < 3 ? "UNBEKANNT" : `${top.level === "moegliche_identifikation" ? "M\xD6GLICHE IDENTIFIKATION" : top.level === "verdacht" ? "VERDACHT" : "HINWEIS"}: ${top.name.toUpperCase()}`;
    update("samples", id, { analysis: { observations: obs, result: res, at: now(), by: u.id }, onsite_assessment: label, updated_at: now() });
    audit(u.id, "analysis", "sample", id, { top: top == null ? void 0 : top.id, level: top == null ? void 0 : top.level, score: top == null ? void 0 : top.score });
    emit("sample.updated", get("samples", id));
    return { ...res, label };
  });
  app.get("/api/missions", async () => list("missions", "", [], "ORDER BY created_at DESC").map((m) => {
    var _a;
    return { ...m, sector_name: ((_a = SECTORS[m.sector]) == null ? void 0 : _a.name) ?? m.sector };
  }));
  app.post("/api/missions", async (req, rep) => {
    const u = need(req, 3);
    const b = req.body;
    if (!get("vehicles", b.vehicle_id)) throw Object.assign(new Error("Fahrzeug erforderlich"), { statusCode: 400 });
    if (!SECTORS[b.sector]) throw Object.assign(new Error("Gebiet erforderlich"), { statusCode: 400 });
    const n = (db.prepare("SELECT MAX(CAST(substr(id,6) AS INTEGER)) m FROM missions").get().m ?? 0) + 1;
    const m = { id: `2026-${String(n).padStart(4, "0")}`, vehicle_id: b.vehicle_id, sector: b.sector, priority: b.priority ?? "NORMAL", profile: b.profile ?? "CHEMISCH", status: "\xDCBERMITTELT", created_by: u.id, created_at: now(), updated_at: now(), notes: b.notes ?? null };
    insert("missions", m);
    audit(u.id, "create", "mission", m.id, m);
    emit("mission.created", m);
    rep.code(201);
    return m;
  });
  const TRANS = {
    "ANGENOMMEN": { from: ["\xDCBERMITTELT"], lvl: 1 },
    "IN BEARBEITUNG": { from: ["\xDCBERMITTELT", "ANGENOMMEN"], lvl: 1 },
    "ABGESCHLOSSEN": { from: ["IN BEARBEITUNG", "ANGENOMMEN"], lvl: 2 },
    "ABGEBROCHEN": { from: ["\xDCBERMITTELT", "ANGENOMMEN", "IN BEARBEITUNG"], lvl: 3 }
  };
  app.patch("/api/missions/:id", async (req) => {
    const id = req.params.id;
    const m = get("missions", id);
    if (!m) throw nf("Auftrag");
    const b = req.body;
    const t = TRANS[b.status];
    if (!t) throw Object.assign(new Error("Ung\xFCltiger Status"), { statusCode: 400 });
    const u = need(req, t.lvl);
    if (!t.from.includes(m.status)) throw Object.assign(new Error(`\xDCbergang ${m.status} \u2192 ${b.status} nicht m\xF6glich`), { statusCode: 409 });
    update("missions", id, { status: b.status, updated_at: now(), started_at: b.status === "IN BEARBEITUNG" ? now() : m.started_at, ended_at: ["ABGESCHLOSSEN", "ABGEBROCHEN"].includes(b.status) ? now() : null, notes: b.notes ?? m.notes });
    audit(u.id, "status", "mission", id, { from: m.status, to: b.status });
    const r = get("missions", id);
    emit("mission.updated", r);
    return r;
  });
  app.get("/api/measurements", async (req) => {
    const p = q(req);
    const w = [];
    const a = [];
    for (const k of ["vehicle_id", "device", "mission_id", "status"]) if (p[k]) {
      w.push(`${k} = ?`);
      a.push(p[k]);
    }
    if (p.anomalies) w.push("status != 'NORMAL'");
    if (p.since) {
      w.push("ts >= ?");
      a.push(p.since);
    }
    return list("measurements", w.length ? "WHERE " + w.join(" AND ") : "", a, `ORDER BY seq DESC LIMIT ${Math.min(+p.limit || 200, 2e3)}`);
  });
  app.get("/api/measurements/:id", async (req) => {
    const m = get("measurements", req.params.id);
    if (!m) throw nf("Messpunkt");
    return { ...m, substance: m.substance_id ? get("substances", m.substance_id) : null, audit: list("audit_log", "WHERE entity = 'measurement' AND entity_id = ?", [m.id], "ORDER BY id") };
  });
  app.post("/api/measurements", async (req, rep) => {
    const u = need(req, 1);
    const b = req.body;
    const seq = (db.prepare("SELECT MAX(seq) m FROM measurements").get().m ?? 0) + 1;
    const v = get("vehicles", b.vehicle_id ?? u.vehicle_id);
    const row = {
      id: "MP-" + String(seq).padStart(6, "0"),
      seq,
      ts: now(),
      lat: b.lat ?? v.lat,
      lon: b.lon ?? v.lon,
      vehicle_id: v.id,
      mission_id: b.mission_id ?? null,
      device: b.device ?? "MANUELL",
      value: b.value ?? null,
      unit: b.unit ?? null,
      status: b.status ?? "AUSWERTUNG ERFORDERLICH",
      level: b.level ?? null,
      headline: b.headline ?? "Manuelle Eingabe",
      remark: b.remark ?? null,
      data_source: "MANUAL"
    };
    insert("measurements", row);
    audit(u.id, "create", "measurement", row.id, row);
    emit("measurement.created", row);
    rep.code(201);
    return row;
  });
  app.patch("/api/measurements/:id", async (req) => {
    const u = need(req, 1);
    const id = req.params.id;
    const m = get("measurements", id);
    if (!m) throw nf("Messpunkt");
    const b = req.body;
    const allowed = ["remark", "headline", "status", "substance_id", "level"];
    const patch = {};
    const diff = {};
    for (const k of allowed) if (b[k] !== void 0 && b[k] !== m[k]) {
      patch[k] = b[k];
      diff[k] = { from: m[k], to: b[k] };
    }
    if (!Object.keys(patch).length) return m;
    update("measurements", id, patch);
    audit(u.id, "update", "measurement", id, diff);
    const r = get("measurements", id);
    emit("measurement.updated", r);
    return r;
  });
  const sampleFull = (id) => {
    const s = get("samples", id);
    if (!s) throw nf("Probe");
    const { truth_ref, ...pub } = s;
    return { ...pub, events: list("sample_events", "WHERE sample_id = ?", [id], "ORDER BY id") };
  };
  app.get("/api/samples", async () => list("samples", "", [], "ORDER BY ts DESC").map(({ truth_ref, ...s }) => s));
  app.get("/api/samples/:id", async (req) => sampleFull(req.params.id));
  app.post("/api/samples", async (req, rep) => {
    var _a;
    const u = need(req, 1);
    const b = req.body;
    const v = get("vehicles", b.vehicle_id ?? u.vehicle_id);
    const n = (db.prepare("SELECT COUNT(*) c FROM samples").get().c ?? 0) + 1;
    const id = `P-2026-${String(n).padStart(5, "0")}`;
    const snap = currentSnapshotAt(v.id);
    const wx = weatherNow();
    const mission = list("missions", "WHERE vehicle_id = ? AND status = 'IN BEARBEITUNG' LIMIT 1", [v.id])[0];
    const kinds = ["FEST", "FL\xDCSSIG", "LUFT", "BIOLOGISCH", "RADIOLOGISCH", "CHEMISCH"];
    const kind = kinds.includes(b.kind) ? b.kind : "FL\xDCSSIG";
    const rd = (k) => devState(v.id, k) === "ready";
    const NB = "GER\xC4T NICHT BETRIEBSBEREIT";
    const readings = { PID: rd("pid") ? `${snap.r.pid.value} ppm` : NB, Dosisleistung: rd("dlm") ? `${snap.r.dose.value} \xB5Sv/h` : NB, IMS: rd("ims") ? snap.r.ims.result : NB, pH: b.ph ?? "NICHT GEMESSEN", ...b.readings ?? {} };
    const row = {
      id,
      ts: now(),
      lat: v.lat,
      lon: v.lon,
      kind,
      description: b.description ?? "",
      color: b.color ?? null,
      consistency: b.consistency ?? null,
      odor: b.odor ?? null,
      turbidity: b.turbidity ?? null,
      readings,
      weather: wx,
      location: b.location ?? null,
      taken_by: b.taken_by ?? u.id,
      mission_id: (mission == null ? void 0 : mission.id) ?? b.mission_id ?? null,
      vehicle_id: v.id,
      transport_status: "ENTNOMMEN",
      lab_status: "AUSSTEHEND",
      onsite_assessment: snap.r.ims.level ? levelText(snap.r.ims.level).toUpperCase() : "UNBEKANNT",
      lab_result: null,
      truth_ref: snap.truth ?? (kind === "BIOLOGISCH" && ((_a = activeIncident()) == null ? void 0 : _a.ref_type) === "biological" ? { type: "biological", id: activeIncident().ref_id } : null),
      updated_at: now()
    };
    insert("samples", row);
    db.prepare("INSERT INTO sample_events(sample_id,ts,status,note,by_user) VALUES(?,?,?,?,?)").run(id, now(), "ENTNOMMEN", null, u.id);
    audit(u.id, "create", "sample", id);
    emit("sample.created", sampleFull(id));
    rep.code(201);
    return sampleFull(id);
  });
  const FLOW = ["ENTNOMMEN", "VERPACKT", "\xDCBERGEBEN", "LABOR EINGEGANGEN", "ANALYSE", "BEFUND EINGEGANGEN"];
  app.post("/api/samples/:id/events", async (req) => {
    const u = need(req, 1);
    const id = req.params.id;
    const s = get("samples", id);
    if (!s) throw nf("Probe");
    const b = req.body;
    const cur = FLOW.indexOf(s.lab_status === "AUSSTEHEND" ? s.transport_status : s.lab_status);
    const nx = FLOW[cur + 1];
    const status = b.status ?? nx;
    if (!FLOW.includes(status)) throw Object.assign(new Error("Ung\xFCltiger Status"), { statusCode: 400 });
    if (status === "BEFUND EINGEGANGEN") throw Object.assign(new Error("Laborbefund wird vom Labor erzeugt"), { statusCode: 409 });
    const lab = ["LABOR EINGEGANGEN", "ANALYSE"].includes(status);
    update("samples", id, { transport_status: lab ? "\xDCBERGEBEN" : status, lab_status: lab ? status : s.lab_status, updated_at: now() });
    db.prepare("INSERT INTO sample_events(sample_id,ts,status,note,by_user) VALUES(?,?,?,?,?)").run(id, now(), status, b.note ?? null, u.id);
    audit(u.id, "status", "sample", id, { status });
    emit("sample.updated", sampleFull(id));
    return sampleFull(id);
  });
  app.post("/api/samples/:id/lab", async (req) => {
    const u = need(req, 3);
    const id = req.params.id;
    if (!get("samples", id)) throw nf("Probe");
    completeLab(id, u.id);
    return sampleFull(id);
  });
  app.patch("/api/samples/:id", async (req) => {
    const u = need(req, 1);
    const id = req.params.id;
    const s = get("samples", id);
    if (!s) throw nf("Probe");
    const b = req.body;
    const diff = {};
    const patch = {};
    for (const k of ["description", "color", "consistency", "odor", "turbidity", "location", "onsite_assessment"]) if (b[k] !== void 0 && b[k] !== s[k]) {
      patch[k] = b[k];
      diff[k] = { from: s[k], to: b[k] };
    }
    if (Object.keys(patch).length) {
      update("samples", id, { ...patch, updated_at: now() });
      audit(u.id, "update", "sample", id, diff);
      emit("sample.updated", sampleFull(id));
    }
    return sampleFull(id);
  });
  app.get("/api/weather", async (req) => ({ current: weatherNow(), history: db.prepare("SELECT * FROM weather_records ORDER BY id DESC LIMIT ?").all(Math.min(+q(req).limit || 120, 1e3)).reverse().map((w) => ({ ...w, wind_from_text: compass(w.wind_from) })) }));
  app.get("/api/alarms", async () => list("alarms", "", [], "ORDER BY ts DESC LIMIT 300"));
  app.patch("/api/alarms/:id", async (req) => {
    const u = need(req, 1);
    const id = req.params.id;
    if (!get("alarms", id)) throw nf("Alarm");
    update("alarms", id, { status: req.body.status });
    audit(u.id, "status", "alarm", id, req.body);
    return get("alarms", id);
  });
  app.get("/api/audit", async (req) => list("audit_log", q(req).entity ? "WHERE entity = ?" : "", q(req).entity ? [q(req).entity] : [], "ORDER BY id DESC LIMIT 300"));
  app.get("/api/situation", async () => {
    const cnt = (cat) => db.prepare("SELECT COUNT(*) c FROM alarms WHERE category = ? AND status != 'ERLEDIGT' AND status != 'QUITTIERT'").get(cat).c;
    return { CHEMISCH: cnt("CHEMISCH"), RADIOLOGISCH: cnt("RADIOLOGISCH"), BIOLOGISCH: cnt("BIOLOGISCH"), NUKLEAR: cnt("NUKLEAR"), UNBEKANNT: cnt("UNBEKANNT"), system: cnt("SYSTEM"), netzwerk: cnt("NETZWERK") };
  });
  app.get("/api/reports", async () => list("reports", "", [], "ORDER BY created_at DESC").map((r) => {
    var _a, _b;
    return { id: r.id, mission_id: r.mission_id, created_at: r.created_at, created_by: r.created_by, kind: ((_a = r.data) == null ? void 0 : _a.kind) ?? "AUFTRAGSBERICHT", title: ((_b = r.data) == null ? void 0 : _b.title) ?? null };
  }));
  app.post("/api/reports", async (req, rep) => {
    const u = need(req, 2);
    const mid = req.body.mission_id;
    const m = get("missions", mid);
    if (!m) throw nf("Auftrag");
    const id = `B-${mid}`;
    const data = buildReport(mid, u.name);
    insert("reports", { id, mission_id: mid, created_at: now(), created_by: u.id, data }, true);
    audit(u.id, "create", "report", id);
    rep.code(201);
    return { id, ...data };
  });
  app.get("/api/reports/:id", async (req) => {
    const r = get("reports", req.params.id);
    if (!r) throw nf("Bericht");
    return { id: r.id, created_at: r.created_at, ...r.data };
  });
  app.get("/api/reports/:id/csv", async (req) => {
    const r = get("reports", req.params.id);
    if (!r) throw nf("Bericht");
    return { filename: `${r.id}.csv`, text: reportCsv(r.data) };
  });
  app.post("/api/import/:table", async (req) => {
    const u = need(req, 4);
    const table = req.params.table;
    if (!["substances", "radionuclides", "biological_agents", "test_tubes"].includes(table)) throw Object.assign(new Error("Tabelle nicht importierbar"), { statusCode: 400 });
    const b = req.body;
    const res = validateImport(table, b.format, b.content);
    if (b.commit) {
      const tx = db.transaction(() => {
        for (const r of [...res.valid, ...res.review]) insert(table, { ...r, quality: "unverified" }, true);
      });
      tx();
      audit(u.id, "import", table, table, { valid: res.valid.length, review: res.review.length });
    }
    return { total: res.total, valid: res.valid.length, review: res.review.map((r) => ({ id: r.id, name: r.name, reasons: r._reasons })), invalid: res.invalid, committed: !!b.commit };
  });
  app.get("/api/admin/:table", async (req) => {
    need(req, 4);
    const t = req.params.table;
    if (!ADMIN_TABLES.includes(t)) throw nf("Tabelle");
    return list(t);
  });
  app.put("/api/admin/:table/:id", async (req) => {
    const u = need(req, 4);
    const { table, id } = req.params;
    if (!ADMIN_TABLES.includes(table)) throw nf("Tabelle");
    const before = get(table, id);
    const body = { ...req.body, id };
    const bad = Object.keys(body).filter((k) => !columns(table).includes(k));
    if (bad.length) throw Object.assign(new Error(`Unbekannte Felder: ${bad.join(", ")}`), { statusCode: 400 });
    insert(table, body, true);
    audit(u.id, before ? "update" : "create", table, id, before ? { before } : void 0);
    return get(table, id);
  });
  app.delete("/api/admin/:table/:id", async (req) => {
    const u = need(req, 4);
    const { table, id } = req.params;
    if (!ADMIN_TABLES.includes(table)) throw nf("Tabelle");
    remove(table, id);
    audit(u.id, "delete", table, id);
    return { ok: true };
  });
}

// server/router.ts
var App = class {
  routes = [];
  hooks = [];
  add(method, pattern, fn) {
    const keys = [];
    const re = new RegExp("^" + pattern.replace(/:([a-zA-Z_]+)/g, (_m, k) => {
      keys.push(k);
      return "([^/]+)";
    }) + "$");
    this.routes.push({ method, re, keys, fn });
  }
  get(p, fn) {
    this.add("GET", p, fn);
  }
  post(p, fn) {
    this.add("POST", p, fn);
  }
  patch(p, fn) {
    this.add("PATCH", p, fn);
  }
  put(p, fn) {
    this.add("PUT", p, fn);
  }
  delete(p, fn) {
    this.add("DELETE", p, fn);
  }
  addHook(_name, fn) {
    this.hooks.push(fn);
  }
  async dispatch(method, fullUrl, body, headers = {}) {
    const u = new URL(fullUrl, "http://local");
    const path4 = u.pathname;
    const query = {};
    u.searchParams.forEach((v, k) => query[k] = v);
    const rep = { statusCode: 200, headers: {}, code(n) {
      this.statusCode = n;
      return this;
    }, header(k, v) {
      this.headers[k.toLowerCase()] = v;
      return this;
    } };
    try {
      const r = this.routes.find((x) => x.method === method && x.re.test(path4));
      const req = { method, url: fullUrl, params: {}, query, body: body ?? {}, headers };
      for (const h of this.hooks) await h(req);
      if (!r) return { status: 404, body: { error: "Nicht gefunden" }, headers: {} };
      const m = r.re.exec(path4);
      r.keys.forEach((k, i) => req.params[k] = decodeURIComponent(m[i + 1]));
      const out = await r.fn(req, rep);
      return { status: rep.statusCode, body: out === void 0 ? {} : out, headers: rep.headers };
    } catch (e) {
      return { status: e.statusCode ?? 500, body: { error: e.message }, headers: {} };
    }
  }
};

// server/core.ts
async function boot(opts) {
  await initDb(opts.dbFile, opts.wasmFile);
  const seeded = getSetting("map_mode", null);
  if (seeded && seeded !== config.mapMode) {
    console.log(`[cbrn] Kartenmodus ${seeded} -> ${config.mapMode}: Daten werden neu angelegt.`);
    db.exec("PRAGMA foreign_keys = OFF");
    for (const t of ["sources", "substances", "radionuclides", "biological_agents", "measurement_devices", "measurement_methods", "test_tubes", "users", "vehicles", "crew", "scenarios", "missions", "measurements", "samples", "sample_events", "weather_records", "alarms", "reports", "audit_log", "runs", "incidents", "sessions", "settings"]) db.exec(`DELETE FROM ${t}`);
    db.exec("PRAGMA foreign_keys = ON");
  }
  seedIfEmpty();
  db.exec("UPDATE runs SET ended_at = COALESCE(ended_at, started_at) WHERE ended_at IS NULL");
  setSetting("map_mode", config.mapMode);
  purgeSessions();
  const app = new App();
  registerRoutes(app);
  startSim();
  setInterval(() => db.save(), 3e4);
  return app;
}

// server/fivem.ts
var CHUNK = 12e3;
var subs = /* @__PURE__ */ new Set();
var live = (src) => {
  try {
    return GetPlayerName(src) != null;
  } catch {
    return false;
  }
};
boot({ dbFile: import_node_path3.default.join(RES_DIR, "data", "cbrn.db"), wasmFile: import_node_path3.default.join(RES_DIR, "server", "sql-wasm.wasm") }).then((app) => {
  onNet("cbrn:req", async (id, method, url, body, token) => {
    const src = source;
    let res;
    try {
      res = await app.dispatch(String(method), String(url), body, { "x-session": String(token ?? "") });
    } catch (e) {
      res = { status: 500, body: { error: (e == null ? void 0 : e.message) ?? "Fehler" } };
    }
    if (res.status !== 401 && token) {
      if (!subs.has(src)) {
        subs.add(src);
        emitNet("cbrn:evt", src, JSON.stringify({ type: "hello", payload: systemStatus(), ts: (/* @__PURE__ */ new Date()).toISOString() }));
      }
    }
    const text = JSON.stringify(res.body === void 0 ? {} : res.body);
    const total = Math.max(1, Math.ceil(text.length / CHUNK));
    for (let i = 0; i < total; i++) emitNet("cbrn:resp", src, id, i, total, res.status, text.slice(i * CHUNK, (i + 1) * CHUNK));
  });
  onNet("cbrn:telemetry", (d) => {
    const src = source;
    if (!d || typeof d.vehicle !== "string") return;
    ingestFivem({ ...d, player: GetPlayerName(src) ?? void 0 });
  });
  bus.on("event", (e) => {
    if (!subs.size) return;
    const msg = JSON.stringify(e);
    for (const s of [...subs]) {
      if (!live(s)) subs.delete(s);
      else emitNet("cbrn:evt", s, msg);
    }
  });
  on("playerDropped", () => {
    subs.delete(source);
  });
  on("onResourceStop", (name) => {
    if (name === GetCurrentResourceName()) db.save();
  });
  console.log("[cbrn] CBRN-Erkunder bereit");
}).catch((e) => console.error("[cbrn] Start fehlgeschlagen:", e));
