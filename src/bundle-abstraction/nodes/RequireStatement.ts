import { FileAbstraction } from "../FileAbstraction";
import { joinFuseBoxPath } from "../../Utils";
import * as path from "path";
function isString(node: any): boolean {
    return node.type === "Literal" || node.type === "StringLiteral";
}

export class RequireStatement {
    public functionName: string;
    public value: string;
    public isNodeModule: boolean;
    public isComputed = false;
    public nodeModuleName: string;
    public nodeModulePartialRequire: string;
    constructor(public file: FileAbstraction, public ast: any) {

        const arg1 = ast.arguments[0];
        this.functionName = ast.callee.name;
        const producer = file.packageAbstraction.bundleAbstraction.producerAbstraction;
        // if it's a string
        if (ast.arguments.length === 1 && isString(arg1)) {

            this.value = ast.arguments[0].value;
            let moduleValues = this.value.match(/^([a-z@](?!:).*)$/);

            this.isNodeModule = moduleValues !== null && moduleValues !== undefined;
            if (moduleValues) {
                const moduleValue = moduleValues[0];

                if (moduleValue.charAt(0) === '@') {
                    this.nodeModuleName = moduleValue
                } else {
                    const [moduleName, partialRequire] = moduleValue.split("/");
                    this.nodeModuleName = moduleName;
                    this.nodeModulePartialRequire = partialRequire;
                }
            }
        } else {
            // notify producer
            producer.useComputedRequireStatements = true;
            producer.useNumbers = false;
            // we assume it's a dynamic import
            this.isComputed = true;
        }


    }

    public setFunctionName(name: string) {
        this.ast.callee.name = name;
    }

    public bindID(id: any) {
        this.ast.callee.name += `.bind({id:${JSON.stringify(id)}})`
    }

    public setValue(str: string) {
        this.ast.arguments[0].value = str;
    }



    public resolve(): FileAbstraction {
        // cannot resolve dynamic imports
        if (this.isComputed) {
            return;
        }
        const pkgName = !this.isNodeModule ? this.file.packageAbstraction.name : this.nodeModuleName;
        let resolvedName;
        const producerAbstraction = this.file.packageAbstraction.bundleAbstraction.producerAbstraction;
        if (!this.isNodeModule) {
            if (/^~\//.test(this.value)) {
                resolvedName = this.value.slice(2)
            } else {
                resolvedName = joinFuseBoxPath(path.dirname(this.file.fuseBoxPath), this.value);
            }
            return producerAbstraction.findFileAbstraction(pkgName, resolvedName);
        } else {
            return producerAbstraction.findFileAbstraction(pkgName, this.nodeModulePartialRequire);
        }
    }
}