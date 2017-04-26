function log2(x) {
    return Math.log(x) / Math.log(2);
}

// problem definition!
class GA_Config {
    // set problem dimension, objective, crossover and mutation rate, penalty parameters.
    // for param[2]: 1 for Maximization and -1 for Minimization.
    constructor(dim, param, penalty, obj) {
        if (arguments.length !== 4) {
            throw new Error("Constructor of Config class needs 4 arguments");
        }
        this.dim = dim;
        this.obj = obj;
        this.cross = param[0];
        this.muta = param[1];
        this.type = param[2];
        this.crosstype = param[3];
        this.penalty = penalty;
        this.constraint = [];
        // console.log(this.obj);
    }

    // sub should be an array of array indicating boundaries of decision variables .
    // presion indicates how deep you want to search the problem domain.
    setSubject(sub, presion) {
        if (sub.length === undefined) {
            throw new Error('setSubject requires an array as its first argument.');
        }
        if (sub.length !== this.dim) {
            throw new Error('You must provide boundary for every decision variable');
        }
        this.sub = sub;
        // use setting to store lower bound, number of bits and actual step for every decision variable.
        this.setting = [];
        sub.forEach((item) => {
            let range = item[1] - item[0];
            let step = parseInt(range / presion);
            let num = Math.ceil(log2(step));
            this.setting.push({
                low: item[0],
                n: num,
                step: range / (Math.pow(2, num) - 1)
            });
        });
        console.log('Setting: ');
        console.log(this.setting);
    }

    // calculating the objective value and plus penalty to it.
    calculate(data, gen) {
        if (this.obj !== undefined && data.length === this.dim) {
            let ans = this.obj(data);
            let punish = 0;
            this.constraint.forEach((item) => {
                punish += Math.pow(item(data), this.penalty[2]);
            });
            return (ans + Math.pow(this.penalty[0] * gen, this.penalty[1]) * punish * -1) * this.type;
        }
        throw new Error(`data's length must be equal to problem dimension.`);
    }

    getSetting() {
        return this.setting;
    }

    // this interface is for adding constraints to the problem
    addConstraint(c) {
        this.constraint.push(c);
    }
}

class Chromosome {
    constructor(setting, genes = null) {
        this.setting = setting;
        // crossover occur!
        if (genes) {
            this.genes = genes;
        }
        // Initialization
        else {
            let total = 0;
            setting.forEach((item) => {
                total += item.n;
            });
            let temp = [];
            for (let i = 0; i < total; i++) {
                temp.push(Math.round(Math.random()));
            }
            this.genes = temp.join('');
        }
    }

    // convert Chromosome into real value.
    getData() {
        let data = [];
        let start = 0;
        this.setting.forEach((item) => {
            let now = this.genes.substr(start, item.n);
            let num = parseInt(now, 2);
            data.push(item.low + num * item.step);
            start = item.n;
        });
        return data;
    }

    // randomly choose one bit from this Chromosome to mutate
    mutation() {
        let range = this.genes.length;
        let index = Math.floor(Math.random() * range);

        let temp = this.genes.charAt(index) === '1' ? '0' : '1';
        this.genes = this.genes.substr(0, index) + temp + this.genes.substr(index + 1);
    }

    // set objective value
    setValue(value) {
        this.value = value;
    }

    // get objective value
    getValue() {
        return this.value;
    }

    // if type === true => one-points crossover
    // else two-point crossover
    crossover(other, type = null) {
        let range = this.genes.length - 5 + 1;
        if (type) {
            let index = Math.floor(Math.random() * range + 5);
            return [
                this.genes.substring(0, index) + other.genes.substring(index),
                other.genes.substring(0, index) + this.genes.substring(index)
            ]
        }
        range /= 2;
        let index1 = Math.floor(Math.random() * range + 5);
        let index2 = Math.floor(Math.random() * range + 5 + range);
        return [
            this.genes.substring(0, index1) + other.genes.substring(index1, index2) + this.genes.substring(index2),
            other.genes.substring(0, index1) + this.genes.substring(index1, index2) + other.genes.substring(index2)
        ]
    }
}

class Genetic {
    // Initialization!
    constructor(config, number) {
        this.pool = [];
        this.config = config;
        this.virtual = [];
        this.virtual.length = number;
        this.table = [];
        this.table.length = number;
        this.number = number;
        for (let i = 0; i < number; i++) {
            this.pool.push(new Chromosome(config.getSetting()));
        }
        this.chartData = [
            ['Generation', 'Best Fitness']
        ];
        this.evaluate(0);
        this.bestGen = 0;
    }


    search(gen) {
        for (let i = 1; i <= gen; i++) {
            // Selection and Reproduce
            let newPool = [];
            this.prepare();
            while (newPool.length < this.number) {
                let parent = this.selection();
                if (Math.random() < this.config.cross) {
                    let spawn = parent[0].crossover(parent[1], this.config.crosstype);
                    for (let j = 0; j < spawn.length; j++) {
                        newPool.push(new Chromosome(
                            this.config.getSetting(),
                            spawn[i]
                        ));
                    }
                }
            }
            this.pool = newPool;
            this.mutation();
            this.evaluate(i);
        }
    }

    // evaluate objective value for every Chromosome
    // and check if we need to update the optimal
    evaluate(gen) {
        this.pool.forEach((item) => {
            item.setValue(this.config.calculate(item.getData(), gen)) ;
        });

        let max = 0;
        for (let i = 1; i < this.pool.length; i++) {
            if (this.pool[i].getValue() > this.pool[max].getValue()) {
                max = i;
            }
        }

        if (this.best === undefined) {
            this.best = this.pool[max].getValue();
            this.bestData = this.pool[max].getData();
        }
        else if (this.pool[max].getValue() > this.best) {
            this.best = this.pool[max].getValue();
            this.bestData = this.pool[max].getData();
            this.bestGen = gen;
        }

        this.chartData.push([
            gen, this.best * this.config.type
        ]);
    }

    // prepare some data for roulette-wheel
    prepare() {
        // get every objective value
        for (let i = 0; i < this.pool.length; i++) {
            this.virtual[i] = this.pool[i].getValue();
        }
        // find the minimum out of them.
        let min = this.virtual[0];
        for (let i = 1; i < this.virtual.length; i++) {
            if (this.virtual[i] < min) {
                min = this.virtual[i];
            }
        }
        // minus virtual by min
        for (let i = 0; i < this.virtual.length; i++) {
            this.virtual[i] -= min;
        }
        // sum up virtual
        let sum = 0;
        this.virtual.forEach((item) => {
            sum += item;
        });
        // compute probability table
        let previous = 0;
        for (let i = 0; i < this.number; i++) {
            this.table[i] = {
                low: previous,
                up: previous + this.virtual[i] / sum
            }
            previous = this.table[i].up;
        }
    }

    // select two Chromosome to be parent
    selection() {
        let parent = [];
        for (let i = 0; i < 2; i++) {
            let prob = Math.random();
            for (let j = 0; j < this.table.length; j++) {
                if (prob >= this.table[j].low && prob < this.table[j].up) {
                    parent.push(this.pool[j]);
                    break;
                }
            }
        }
        return parent;
    }

    // check which Chromosome needs mutation.
    mutation() {
        for (let i = 0; i < this.pool.length; i++) {
            if (Math.random() < this.config.muta) {
                this.pool[i].mutation();
            }
        }
    }

    // return the optimal objective value and position.
    result() {
        return [
            this.best * this.config.type,
            this.bestData,
            this.bestGen
        ];
    }
}
